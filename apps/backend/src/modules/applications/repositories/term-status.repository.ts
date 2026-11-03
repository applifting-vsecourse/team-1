import { PrismaService } from "@/core/prisma/prisma.service"
import { StatusChangeSnapshot } from "@/modules/applications/domain/status-transition"
import { termLabel } from "@/modules/applications/domain/term-label"
import {
  ExpiredWaitlistEntry,
  StatusChangeCommand,
  StatusChangeResult,
  TermStatusDetail,
} from "@/modules/applications/domain/term-status"
import { resolveChangeEmailLocale } from "@/modules/participants/domain/change-email-locale"
import { Injectable } from "@nestjs/common"

@Injectable()
export class TermStatusRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findTerms(applicationId: string, organizationId: string): Promise<TermStatusDetail[]> {
    const rows = await this.prisma.applicationTerm.findMany({
      where: { applicationId, organizationId },
      orderBy: { term: { startsOn: "asc" } },
      include: {
        term: { select: { name: true, startsOn: true, endsOn: true } },
        statusChanges: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          include: { changedBy: { select: { name: true } } },
        },
      },
    })
    return rows.map((row) => ({
      termId: row.termId,
      name: row.term.name,
      startsOn: row.term.startsOn,
      endsOn: row.term.endsOn,
      status: row.status,
      priceCzk: row.priceCzk,
      history: row.statusChanges.map((change) => ({
        id: change.id,
        fromStatus: change.fromStatus,
        toStatus: change.toStatus,
        changedByName: change.changedBy?.name ?? null,
        changedAt: change.createdAt,
      })),
    }))
  }

  /**
   * Applications on the waitlist in terms that start on `today` or earlier (a date in Prague,
   * see `todayInPrague`). Terms cancelled by the organizer are left alone (US-13). Across
   * organizations on purpose: the system acts, each row carries its own organizationId.
   */
  async findWaitlistedStartedBy(today: Date): Promise<ExpiredWaitlistEntry[]> {
    const rows = await this.prisma.applicationTerm.findMany({
      where: { status: "WAITLISTED", term: { startsOn: { lte: today }, cancelledAt: null } },
      select: { organizationId: true, applicationId: true, termId: true },
      orderBy: { id: "asc" },
    })
    return rows
  }

  /**
   * The one place that writes a status change and its system log entry, in one
   * transaction. Locks the event like the submission does (docs/PROJEKT.md,
   * "Souběh"), reads what the decision needs and hands it to `decide`, which
   * throws to reject; so the capacity check and the write cannot race a
   * submission for the last bed. Returns null when the application or its term
   * is not there.
   */
  async changeStatus(
    command: StatusChangeCommand,
    decide: (snapshot: StatusChangeSnapshot) => void,
  ): Promise<StatusChangeResult | null> {
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.findFirst({
        where: { id: command.applicationId, organizationId: command.organizationId },
        include: {
          event: { include: { organization: { select: { name: true, bankAccount: true } } } },
        },
      })
      if (!application) return null
      await tx.$queryRaw`SELECT id FROM event WHERE id = ${application.eventId} FOR UPDATE`

      const current = await tx.applicationTerm.findUnique({
        where: {
          applicationId_termId: { applicationId: application.id, termId: command.termId },
        },
        include: { term: { select: { name: true, startsOn: true, endsOn: true } } },
      })
      if (!current) return null

      const [rooms, confirmed] = await Promise.all([
        tx.room.findMany({
          where: { termId: command.termId },
          select: { capacity: true, gender: true },
        }),
        tx.applicationTerm.findMany({
          where: {
            organizationId: command.organizationId,
            termId: command.termId,
            status: "CONFIRMED",
          },
          select: { application: { select: { gender: true } } },
        }),
      ])
      decide({
        status: current.status,
        gender: application.gender,
        rooms,
        confirmedGenders: confirmed.map((row) => row.application.gender),
      })

      await tx.applicationTerm.update({
        where: { id: current.id },
        data: { status: command.to },
      })
      await tx.applicationTermStatusChange.create({
        data: {
          organizationId: command.organizationId,
          applicationTermId: current.id,
          fromStatus: current.status,
          toStatus: command.to,
          changedById: command.actorId,
        },
      })

      // D-078: the e-mail goes in the user's preferred language, else in the language of the
      // user's first application; the term labels follow it.
      const [user, first] = application.userId
        ? await Promise.all([
            tx.user.findUnique({ where: { id: application.userId }, select: { locale: true } }),
            tx.application.findFirst({
              where: { userId: application.userId },
              orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
              select: { locale: true },
            }),
          ])
        : [null, null]
      const locale = resolveChangeEmailLocale({
        userLocale: user?.locale ?? null,
        firstApplicationLocale: first?.locale ?? application.locale,
      })

      const terms = await tx.applicationTerm.findMany({
        where: { applicationId: application.id },
        orderBy: { term: { startsOn: "asc" } },
        include: { term: { select: { name: true, number: true, startsOn: true, endsOn: true } } },
      })
      return {
        from: current.status,
        to: command.to,
        email: application.email,
        locale,
        eventName: application.event.name,
        organizationName: application.event.organization.name,
        bankAccount: application.event.organization.bankAccount,
        gender: application.gender,
        termName: termLabel(current.term, locale),
        application: {
          number: application.number,
          firstName: application.firstName,
          lastName: application.lastName,
          accessToken: application.accessToken,
          terms: terms.map((row) => ({
            name: termLabel(row.term, locale),
            termNumber: row.term.number,
            status: row.status,
            priceCzk: row.priceCzk,
          })),
        },
      }
    })
  }
}
