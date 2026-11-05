import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { computeAvailablePlaces } from "@/modules/applications/domain/capacity"
import {
  sameSelection,
  termChangeApprovalPolicy,
} from "@/modules/applications/domain/change-request"
import { findDuplicate } from "@/modules/applications/domain/duplicate-application"
import { evaluateApplication } from "@/modules/applications/domain/evaluation"
import {
  participantChangeAllowed,
  ParticipantChangeOptions,
} from "@/modules/applications/domain/participant-term-change"
import {
  changeEmailKind,
  StatusChangeSnapshot,
} from "@/modules/applications/domain/status-transition"
import { skippedSubstitutes } from "@/modules/applications/domain/substitute-skips"
import { formatTermDates, termLabel } from "@/modules/applications/domain/term-label"
import {
  ExpiredWaitlistEntry,
  StatusChangeCommand,
  StatusChangeResult,
  SubstituteRecord,
  TermStatusDetail,
} from "@/modules/applications/domain/term-status"
import { bedGroup, WaitlistCandidate } from "@/modules/applications/domain/waitlist"
import { buildNotification, isoDay } from "@/modules/notifications/domain/notification"
import { NotificationsRepository } from "@/modules/notifications/repositories/notifications.repository"
import { resolveChangeEmailLocale } from "@/modules/participants/domain/change-email-locale"
import { ApplicationChange } from "@/modules/participants/domain/submission-confirmation"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

const recordInclude = {
  changedBy: { select: { name: true } },
  applicationTerm: {
    select: {
      termId: true,
      status: true,
      term: { select: { roomMode: true } },
      application: { select: { id: true, firstName: true, lastName: true, gender: true } },
    },
  },
  skips: {
    orderBy: { createdAt: "asc" },
    select: {
      skippedApplicationTerm: {
        select: {
          status: true,
          application: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  },
} as const satisfies Prisma.ApplicationTermStatusChangeInclude

type RecordRow = Prisma.ApplicationTermStatusChangeGetPayload<{ include: typeof recordInclude }>

const fullName = (person: { firstName: string; lastName: string }): string =>
  `${person.firstName} ${person.lastName}`

function toRecord(row: RecordRow): SubstituteRecord {
  const { application, term, termId, status } = row.applicationTerm
  return {
    id: row.id,
    termId,
    group: bedGroup(term.roomMode, application.gender),
    confirmed: { applicationId: application.id, name: fullName(application), status },
    skipped: row.skips.map(
      ({ skippedApplicationTerm: { application: skipped, status: skippedStatus } }) => ({
        applicationId: skipped.id,
        name: fullName(skipped),
        status: skippedStatus,
      }),
    ),
    changedByName: row.changedBy?.name ?? null,
    changedAt: row.createdAt,
  }
}

@Injectable()
export class TermStatusRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsRepository,
  ) {}

  /** The terms the owner can choose, and the current approval boundary (US-113). */
  async participantChangeOptions(
    userId: string,
    applicationId: string,
  ): Promise<ParticipantChangeOptions | null> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
      select: {
        event: {
          select: {
            cancellationStartsOn: true,
            terms: {
              where: { cancelledAt: null },
              orderBy: [{ startsOn: "asc" }, { id: "asc" }],
              select: {
                id: true,
                name: true,
                startsOn: true,
                endsOn: true,
                _count: { select: { rooms: true } },
              },
            },
          },
        },
        terms: { select: { termId: true, status: true } },
      },
    })
    if (!application) return null
    const active = new Set(
      application.terms.filter((row) => row.status !== "CANCELLED").map((row) => row.termId),
    )
    const cancelled = new Set(
      application.terms.filter((row) => row.status === "CANCELLED").map((row) => row.termId),
    )
    return {
      canChangeImmediately: participantChangeAllowed(
        application.event.cancellationStartsOn,
        new Date(),
      ),
      terms: application.event.terms
        .filter((term) => !cancelled.has(term.id) && (active.has(term.id) || term._count.rooms > 0))
        .map((term) => ({
          id: term.id,
          name: term.name,
          startsOn: term.startsOn.toISOString().slice(0, 10),
          endsOn: term.endsOn.toISOString().slice(0, 10),
          selected: active.has(term.id),
        })),
    }
  }

  /** Replaces the owner's active term selection under the event lock. Cancelled rows and payments stay for audit. */
  async changeParticipantTerms(
    userId: string,
    applicationId: string,
    selectedIds: string[],
    approvedRequest?: { id: string; reviewerId: string },
  ): Promise<ApplicationChange | null | undefined> {
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.findFirst({
        where: { id: applicationId, userId },
        include: {
          event: { include: { organization: { select: { name: true, bankAccount: true } } } },
        },
      })
      if (!application) return undefined
      await tx.$queryRaw`SELECT id FROM event WHERE id = ${application.eventId} FOR UPDATE`
      const event = await tx.event.findUniqueOrThrow({
        where: { id: application.eventId },
        select: { cancellationStartsOn: true, evaluationMode: true },
      })
      if (!approvedRequest && !participantChangeAllowed(event.cancellationStartsOn, new Date())) {
        throw new AppException(HttpStatus.CONFLICT, "CANCELLATION_APPROVAL_REQUIRED")
      }

      const current = await tx.applicationTerm.findMany({
        where: { applicationId, organizationId: application.organizationId },
      })
      const active = current.filter((row) => row.status !== "CANCELLED")
      const activeIds = new Set(active.map((row) => row.termId))
      if (approvedRequest) {
        const request = await tx.changeRequest.findFirst({
          where: {
            id: approvedRequest.id,
            applicationId,
            organizationId: application.organizationId,
            status: "PENDING",
          },
        })
        if (!request) throw new AppException(HttpStatus.CONFLICT, "CHANGE_REQUEST_NOT_PENDING")
        if (
          !sameSelection(request.currentTermIds, [...activeIds]) ||
          !sameSelection(request.requestedTermIds, selectedIds)
        ) {
          throw new AppException(HttpStatus.CONFLICT, "CHANGE_REQUEST_STALE")
        }
      }
      const desired = new Set(selectedIds)
      const removed = active.filter((row) => !desired.has(row.termId))
      const addedIds = selectedIds.filter((id) => !activeIds.has(id))
      if (removed.length === 0 && addedIds.length === 0) return null

      const offered = await tx.term.findMany({
        where: {
          id: { in: addedIds },
          eventId: application.eventId,
          organizationId: application.organizationId,
          cancelledAt: null,
        },
        select: {
          id: true,
          name: true,
          startsOn: true,
          endsOn: true,
          number: true,
          priceCzk: true,
          _count: { select: { rooms: true } },
        },
      })
      if (
        offered.length !== addedIds.length ||
        offered.some((term) => term._count.rooms === 0) ||
        addedIds.some((id) => current.some((row) => row.termId === id))
      ) {
        throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
      }

      let hasNewConfirmation = false
      if (addedIds.length > 0) {
        const registered = await tx.applicationTerm.findMany({
          where: {
            organizationId: application.organizationId,
            termId: { in: addedIds },
            status: { not: "CANCELLED" },
            application: { eventId: application.eventId, birthDate: application.birthDate },
          },
          select: {
            termId: true,
            application: { select: { firstName: true, lastName: true, birthDate: true } },
          },
        })
        const duplicate = findDuplicate(
          registered.map(({ termId, application: person }) => ({
            termId,
            firstName: person.firstName,
            lastName: person.lastName,
            birthDate: person.birthDate.toISOString().slice(0, 10),
          })),
          [
            {
              firstName: application.firstName,
              lastName: application.lastName,
              birthDate: application.birthDate.toISOString().slice(0, 10),
              termIds: addedIds,
            },
          ],
        )
        if (duplicate) {
          const term = offered.find((row) => row.id === duplicate.termId)!
          throw new AppException(HttpStatus.CONFLICT, "APPLICATION_DUPLICATE", undefined, {
            participant: `${application.firstName} ${application.lastName}`,
            term: termLabel(term, application.locale),
          })
        }
      }

      for (const row of removed) {
        await tx.applicationTerm.update({ where: { id: row.id }, data: { status: "CANCELLED" } })
        await tx.applicationTermStatusChange.create({
          data: {
            organizationId: application.organizationId,
            applicationTermId: row.id,
            fromStatus: row.status,
            toStatus: "CANCELLED",
            changedById: approvedRequest?.reviewerId ?? userId,
          },
        })
      }

      if (addedIds.length > 0) {
        const [rooms, confirmed] = await Promise.all([
          tx.room.findMany({
            where: { organizationId: application.organizationId, termId: { in: addedIds } },
            select: { termId: true, capacity: true, gender: true },
          }),
          tx.applicationTerm.findMany({
            where: {
              organizationId: application.organizationId,
              termId: { in: addedIds },
              status: "CONFIRMED",
            },
            select: { termId: true, application: { select: { gender: true } } },
          }),
        ])
        const termsToEvaluate = offered.map((term) => ({
          termId: term.id,
          priceCzk: term.priceCzk,
          freePlaces: computeAvailablePlaces(
            rooms.filter((room) => room.termId === term.id),
            confirmed.filter((row) => row.termId === term.id).map((row) => row.application.gender),
          ),
        }))
        const policy = termChangeApprovalPolicy(
          event.evaluationMode,
          Boolean(approvedRequest),
          application.gender,
          termsToEvaluate,
        )
        if (!policy.hasCapacity) {
          throw new AppException(HttpStatus.CONFLICT, "CAPACITY_EXCEEDED")
        }
        const evaluated = evaluateApplication(
          application.gender,
          termsToEvaluate,
          policy.evaluationMode,
        )
        hasNewConfirmation = evaluated.some((term) => term.status === "CONFIRMED")
        for (const term of evaluated) {
          await tx.applicationTerm.create({
            data: {
              organizationId: application.organizationId,
              applicationId,
              termId: term.termId,
              status: term.status,
              priceCzk: term.priceCzk,
            },
          })
        }
      }

      if (approvedRequest) {
        await tx.changeRequest.update({
          where: { id: approvedRequest.id },
          data: {
            status: "APPROVED",
            reviewedById: approvedRequest.reviewerId,
            reviewedAt: new Date(),
            notificationReadAt: null,
          },
        })
      }

      const [user, first, terms] = await Promise.all([
        tx.user.findUnique({ where: { id: userId }, select: { locale: true } }),
        tx.application.findFirst({
          where: { userId },
          orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
          select: { locale: true },
        }),
        tx.applicationTerm.findMany({
          where: { applicationId, organizationId: application.organizationId },
          orderBy: { term: { startsOn: "asc" } },
          include: { term: { select: { name: true, number: true, startsOn: true, endsOn: true } } },
        }),
      ])
      const locale = resolveChangeEmailLocale({
        userLocale: user?.locale ?? null,
        firstApplicationLocale: first?.locale ?? application.locale,
      })
      const oneCancelled = removed.length === 1 && addedIds.length === 0
      const changedTerm = oneCancelled
        ? terms.find((row) => row.termId === removed[0].termId)
        : null
      // US-118: only the cancellation of a term is told in the app (docs/emaily/KATALOG.md, APP_CANCELLED_BY_APPLICANT); a change
      // of terms is not, the participant has just made it themselves.
      if (changedTerm) {
        await this.notifications.create(
          tx,
          buildNotification({
            userId,
            applicationId,
            kind: "CANCELLED",
            params: {
              eventName: application.event.name,
              participantName: `${application.firstName} ${application.lastName}`,
              termStartsOn: isoDay(changedTerm.term.startsOn),
              termEndsOn: isoDay(changedTerm.term.endsOn),
              fromStatus: removed[0].status,
              toStatus: "CANCELLED",
            },
          }),
        )
      }
      return {
        email: application.email,
        locale,
        eventName: application.event.name,
        organizationName: application.event.organization.name,
        bankAccount: application.event.organization.bankAccount,
        gender: application.gender,
        termName: changedTerm ? termLabel(changedTerm.term, locale) : "",
        termDates: changedTerm
          ? formatTermDates(changedTerm.term.startsOn, changedTerm.term.endsOn, locale)
          : "",
        termCustomName: changedTerm?.term.name?.trim() || null,
        kind: oneCancelled ? "CANCELLED" : "TERMS_CHANGED",
        isAmountChanged: hasNewConfirmation,
        application: {
          number: application.number,
          firstName: application.firstName,
          lastName: application.lastName,
          accessToken: application.accessToken,
          terms: terms.map((row) => ({
            name: termLabel(row.term, locale),
            dates: formatTermDates(row.term.startsOn, row.term.endsOn, locale),
            customName: row.term.name?.trim() || null,
            termNumber: row.term.number,
            status: row.status,
            priceCzk: row.priceCzk,
          })),
        },
      }
    })
  }

  /**
   * Records of confirmations from the waitlist in a term (US-105), newest first. Null when the
   * term is not a term of the event.
   */
  async findSubstituteRecords(
    organizationId: string,
    eventId: string,
    termId: string,
  ): Promise<SubstituteRecord[] | null> {
    const term = await this.prisma.term.findFirst({
      where: { id: termId, eventId, organizationId },
      select: { id: true },
    })
    if (!term) return null
    const rows = await this.prisma.applicationTermStatusChange.findMany({
      where: {
        organizationId,
        fromStatus: "WAITLISTED",
        toStatus: "CONFIRMED",
        applicationTerm: { termId },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: recordInclude,
    })
    return rows.map(toRecord)
  }

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
    const records = await this.prisma.applicationTermStatusChange.findMany({
      where: {
        organizationId,
        fromStatus: "WAITLISTED",
        toStatus: "CONFIRMED",
        OR: [
          { applicationTerm: { applicationId } },
          { skips: { some: { skippedApplicationTerm: { applicationId } } } },
        ],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: recordInclude,
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
      substituteRecords: records.map(toRecord).filter((record) => record.termId === row.termId),
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

      // US-105: who waits ahead of the one confirmed from the waitlist is read before the change
      // and stored with it, so the record cannot differ from what the decision saw.
      const skippedIds =
        current.status === "WAITLISTED" && command.to === "CONFIRMED"
          ? await this.findSkipped(tx, command.organizationId, command.termId, application.id)
          : []

      await tx.applicationTerm.update({
        where: { id: current.id },
        data: { status: command.to },
      })
      const change = await tx.applicationTermStatusChange.create({
        data: {
          organizationId: command.organizationId,
          applicationTermId: current.id,
          fromStatus: current.status,
          toStatus: command.to,
          changedById: command.actorId,
        },
      })
      if (skippedIds.length > 0) {
        await tx.applicationTermSkip.createMany({
          data: skippedIds.map((applicationTermId) => ({
            organizationId: command.organizationId,
            statusChangeId: change.id,
            skippedApplicationTermId: applicationTermId,
          })),
        })
      }

      // US-118: the same transition that gets an e-mail gets a notification, in this transaction.
      await this.notifications.create(
        tx,
        buildNotification({
          userId: application.userId,
          applicationId: application.id,
          kind: changeEmailKind(
            command.to,
            current.status,
            command.actorId === null ? "SYSTEM" : "ORGANIZER",
          ),
          params: {
            eventName: application.event.name,
            participantName: `${application.firstName} ${application.lastName}`,
            termStartsOn: isoDay(current.term.startsOn),
            termEndsOn: isoDay(current.term.endsOn),
            fromStatus: current.status,
            toStatus: command.to,
          },
        }),
      )

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
        termDates: formatTermDates(current.term.startsOn, current.term.endsOn, locale),
        termCustomName: current.term.name?.trim() || null,
        application: {
          number: application.number,
          firstName: application.firstName,
          lastName: application.lastName,
          accessToken: application.accessToken,
          terms: terms.map((row) => ({
            name: termLabel(row.term, locale),
            dates: formatTermDates(row.term.startsOn, row.term.endsOn, locale),
            customName: row.term.name?.trim() || null,
            termNumber: row.term.number,
            status: row.status,
            priceCzk: row.priceCzk,
          })),
        },
      }
    })
  }

  /** Ids of the application terms skipped by confirming `applicationId` from the waitlist. */
  private async findSkipped(
    tx: Prisma.TransactionClient,
    organizationId: string,
    termId: string,
    applicationId: string,
  ): Promise<string[]> {
    const [term, waiting] = await Promise.all([
      tx.term.findUnique({ where: { id: termId }, select: { roomMode: true } }),
      tx.applicationTerm.findMany({
        where: { organizationId, termId, status: "WAITLISTED" },
        select: {
          id: true,
          application: { select: { id: true, gender: true, submittedAt: true, number: true } },
        },
      }),
    ])
    if (!term) return []
    const candidates: WaitlistCandidate[] = waiting.map(({ application }) => ({
      applicationId: application.id,
      termId,
      roomMode: term.roomMode,
      gender: application.gender,
      status: "WAITLISTED",
      submittedAt: application.submittedAt,
      number: application.number,
    }))
    const applicationTermIdOf = new Map(waiting.map((row) => [row.application.id, row.id]))
    return skippedSubstitutes({ applicationId, termId }, candidates).map((skippedApplicationId) =>
      applicationTermIdOf.get(skippedApplicationId)!,
    )
  }
}
