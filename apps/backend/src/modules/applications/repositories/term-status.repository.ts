import { PrismaService } from "@/core/prisma/prisma.service"
import { computeAvailablePlaces } from "@/modules/applications/domain/capacity"
import {
  canChangeManually,
  exceedsCapacityWhenConfirmed,
} from "@/modules/applications/domain/status-transition"
import {
  StatusChangeCommand,
  StatusChangeResult,
  TermStatusDetail,
} from "@/modules/applications/domain/term-status"
import { AppException } from "@/shared/errors/app.exception"
import { ForbiddenException, HttpStatus, Injectable } from "@nestjs/common"

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
   * The one place that changes the status of an application in a term and
   * writes the system log entry, in one transaction. Locks the event like the
   * submission does (docs/PROJEKT.md, "Souběh"), so a confirmation never races
   * a submission for the last bed.
   */
  async changeStatus(command: StatusChangeCommand): Promise<StatusChangeResult> {
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.findFirst({
        where: { id: command.applicationId, organizationId: command.organizationId },
        include: { event: { include: { organization: { select: { bankAccount: true } } } } },
      })
      if (!application) throw new ForbiddenException()
      await tx.$queryRaw`SELECT id FROM event WHERE id = ${application.eventId} FOR UPDATE`

      const current = await tx.applicationTerm.findUnique({
        where: {
          applicationId_termId: { applicationId: application.id, termId: command.termId },
        },
      })
      if (!current) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
      if (!canChangeManually(current.status, command.to)) {
        throw new AppException(HttpStatus.CONFLICT, "INVALID_STATUS_TRANSITION")
      }

      if (command.to === "CONFIRMED" && !command.isOverCapacityConfirmed) {
        const [rooms, confirmed] = await Promise.all([
          tx.room.findMany({
            where: { eventId: application.eventId },
            select: { capacity: true, gender: true },
          }),
          tx.applicationTerm.findMany({
            where: { termId: command.termId, status: "CONFIRMED" },
            select: { application: { select: { gender: true } } },
          }),
        ])
        const free = computeAvailablePlaces(
          rooms,
          confirmed.map((row) => row.application.gender),
        )
        if (exceedsCapacityWhenConfirmed(application.gender, free)) {
          throw new AppException(HttpStatus.CONFLICT, "CAPACITY_EXCEEDED")
        }
      }

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

      const terms = await tx.applicationTerm.findMany({
        where: { applicationId: application.id },
        orderBy: { term: { startsOn: "asc" } },
        include: { term: { select: { name: true } } },
      })
      return {
        from: current.status,
        to: command.to,
        email: application.email,
        locale: application.locale,
        eventName: application.event.name,
        bankAccount: application.event.organization.bankAccount,
        application: {
          number: application.number,
          firstName: application.firstName,
          lastName: application.lastName,
          accessToken: application.accessToken,
          terms: terms.map((row) => ({
            name: row.term.name,
            status: row.status,
            priceCzk: row.priceCzk,
          })),
        },
      }
    })
  }
}
