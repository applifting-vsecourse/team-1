import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import {
  ChangeRequest,
  sameSelection,
  selectionPriceCzk,
} from "@/modules/applications/domain/change-request"
import { participantChangeAllowed } from "@/modules/applications/domain/participant-term-change"
import { HealthDecision } from "@/modules/health/domain/health"
import { resolveChangeEmailLocale } from "@/modules/participants/domain/change-email-locale"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

const include = {
  application: {
    select: {
      firstName: true,
      lastName: true,
      gender: true,
      email: true,
      locale: true,
      terms: { select: { termId: true, priceCzk: true } },
      health: { select: { note: true } },
    },
  },
  applicant: {
    select: {
      locale: true,
      applications: { orderBy: { submittedAt: "asc" }, take: 1, select: { locale: true } },
    },
  },
  event: {
    select: {
      name: true,
      terms: {
        select: { id: true, name: true, startsOn: true, endsOn: true, priceCzk: true },
      },
    },
  },
} as const satisfies Prisma.ChangeRequestInclude

@Injectable()
export class ChangeRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    applicantId: string,
    applicationId: string,
    requestedTermIds: string[],
  ): Promise<ChangeRequest> {
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.findFirst({
        where: { id: applicationId, userId: applicantId },
        select: { eventId: true, organizationId: true },
      })
      if (!application) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      await tx.$queryRaw`SELECT id FROM event WHERE id = ${application.eventId} FOR UPDATE`
      const event = await tx.event.findUniqueOrThrow({
        where: { id: application.eventId },
        select: { cancellationStartsOn: true },
      })
      if (participantChangeAllowed(event.cancellationStartsOn, new Date())) {
        throw new AppException(HttpStatus.CONFLICT, "CHANGE_REQUEST_NOT_REQUIRED")
      }
      const current = await tx.applicationTerm.findMany({
        where: { applicationId, organizationId: application.organizationId },
        select: { termId: true, status: true },
      })
      const activeIds = current.filter((row) => row.status !== "CANCELLED").map((row) => row.termId)
      if (activeIds.length === 0 || sameSelection(activeIds, requestedTermIds)) {
        throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
      }
      const cancelled = new Set(
        current.filter((row) => row.status === "CANCELLED").map((row) => row.termId),
      )
      const addedIds = requestedTermIds.filter((id) => !activeIds.includes(id))
      const offered = await tx.term.findMany({
        where: {
          id: { in: addedIds },
          eventId: application.eventId,
          organizationId: application.organizationId,
          cancelledAt: null,
        },
        select: { id: true, _count: { select: { rooms: true } } },
      })
      if (
        requestedTermIds.some((id) => cancelled.has(id)) ||
        offered.length !== addedIds.length ||
        offered.some((term) => term._count.rooms === 0)
      ) {
        throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
      }
      const pending = await tx.changeRequest.findFirst({
        where: { applicationId, status: "PENDING", kind: "TERMS" },
        select: { id: true },
      })
      if (pending) throw new AppException(HttpStatus.CONFLICT, "CHANGE_REQUEST_PENDING")
      const created = await tx.changeRequest.create({
        data: {
          organizationId: application.organizationId,
          eventId: application.eventId,
          applicationId,
          applicantId,
          currentTermIds: activeIds,
          requestedTermIds,
        },
        include,
      })
      return this.toDomain(created)
    })
  }

  /** US-68: the applicant asks to change health data that is already filled in. */
  async createHealth(
    applicantId: string,
    applicationId: string,
    decision: HealthDecision,
  ): Promise<ChangeRequest> {
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.findFirst({
        where: { id: applicationId, userId: applicantId },
        select: { eventId: true, organizationId: true },
      })
      if (!application) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      // Same event lock as the term requests: concurrent submissions are checked one by one.
      await tx.$queryRaw`SELECT id FROM event WHERE id = ${application.eventId} FOR UPDATE`
      const stored = await tx.applicationHealth.findUnique({
        where: { applicationId },
        select: { note: true },
      })
      if (!stored) {
        throw new AppException(HttpStatus.CONFLICT, "HEALTH_REQUEST_NOT_NEEDED")
      }
      if (decision.kind === "consent-required") {
        throw new AppException(HttpStatus.BAD_REQUEST, "HEALTH_CONSENT_REQUIRED")
      }
      const note = decision.kind === "save" ? decision.note : ""
      if (note === stored.note) {
        throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
      }
      const pending = await tx.changeRequest.findFirst({
        where: { applicationId, status: "PENDING", kind: "HEALTH" },
        select: { id: true },
      })
      if (pending) throw new AppException(HttpStatus.CONFLICT, "CHANGE_REQUEST_PENDING")
      const created = await tx.changeRequest.create({
        data: {
          organizationId: application.organizationId,
          eventId: application.eventId,
          applicationId,
          applicantId,
          kind: "HEALTH",
          currentTermIds: [],
          requestedTermIds: [],
          healthNote: note,
        },
        include,
      })
      return this.toDomain(created)
    })
  }

  /** US-68: approval writes the requested note (consent given with the request) and closes it. */
  async approveHealth(
    organizationId: string,
    eventId: string,
    requestId: string,
    reviewerId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Same event lock as `reject`, so a concurrent decision on one request is serialized.
      await tx.$queryRaw`SELECT id FROM event WHERE id = ${eventId} FOR UPDATE`
      const request = await tx.changeRequest.findUnique({ where: { id: requestId } })
      if (!request) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
      if (request.organizationId !== organizationId || request.eventId !== eventId) {
        throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      }
      const closed = await tx.changeRequest.updateMany({
        where: { id: requestId, status: "PENDING", kind: "HEALTH" },
        data: {
          status: "APPROVED",
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          notificationReadAt: null,
        },
      })
      if (closed.count === 0)
        throw new AppException(HttpStatus.CONFLICT, "CHANGE_REQUEST_NOT_PENDING")
      const note = request.healthNote ?? ""
      if (note === "") {
        await tx.applicationHealth.deleteMany({ where: { applicationId: request.applicationId } })
      } else {
        await tx.applicationHealth.upsert({
          where: { applicationId: request.applicationId },
          create: {
            organizationId,
            applicationId: request.applicationId,
            note,
            consentAt: request.createdAt,
          },
          update: { note, consentAt: request.createdAt },
        })
      }
    })
  }

  async forParticipant(applicantId: string, applicationId: string): Promise<ChangeRequest[]> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, userId: applicantId },
      select: { id: true },
    })
    if (!application) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    const rows = await this.prisma.changeRequest.findMany({
      where: { applicationId, applicantId, kind: "TERMS" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include,
    })
    return rows.map(this.toDomain)
  }

  async pendingForEvent(organizationId: string, eventId: string): Promise<ChangeRequest[]> {
    const rows = await this.prisma.changeRequest.findMany({
      where: { organizationId, eventId, status: "PENDING" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include,
    })
    return rows.map(this.toDomain)
  }

  async findForOrganizer(
    organizationId: string,
    eventId: string,
    requestId: string,
  ): Promise<ChangeRequest | null> {
    const scope = await this.prisma.changeRequest.findUnique({
      where: { id: requestId },
      select: { organizationId: true, eventId: true },
    })
    if (!scope) return null
    if (scope.organizationId !== organizationId || scope.eventId !== eventId) {
      throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    }
    const row = await this.prisma.changeRequest.findUnique({ where: { id: requestId }, include })
    return row ? this.toDomain(row) : null
  }

  async reject(
    organizationId: string,
    eventId: string,
    requestId: string,
    actorId: string,
    reason: string,
  ): Promise<ChangeRequest> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM event WHERE id = ${eventId} FOR UPDATE`
      const scope = await tx.changeRequest.findUnique({
        where: { id: requestId },
        select: { organizationId: true, eventId: true, status: true },
      })
      if (!scope) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
      if (scope.organizationId !== organizationId || scope.eventId !== eventId) {
        throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      }
      if (scope.status !== "PENDING") {
        throw new AppException(HttpStatus.CONFLICT, "CHANGE_REQUEST_NOT_PENDING")
      }
      const updated = await tx.changeRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          rejectionReason: reason,
          reviewedById: actorId,
          reviewedAt: new Date(),
          notificationReadAt: null,
        },
        include,
      })
      return this.toDomain(updated)
    })
  }

  async notificationsForParticipant(applicantId: string): Promise<
    {
      id: string
      applicationId: string
      eventName: string
      status: "PENDING" | "APPROVED" | "REJECTED"
      createdAt: Date
      reviewedAt: Date | null
      readAt: Date | null
    }[]
  > {
    const rows = await this.prisma.changeRequest.findMany({
      where: { applicantId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        applicationId: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        notificationReadAt: true,
        event: { select: { name: true } },
      },
    })
    return rows.map((row) => ({
      id: row.id,
      applicationId: row.applicationId,
      eventName: row.event.name,
      status: row.status,
      createdAt: row.createdAt,
      reviewedAt: row.reviewedAt,
      readAt: row.notificationReadAt,
    }))
  }

  async markNotificationRead(applicantId: string, requestId: string): Promise<void> {
    const scope = await this.prisma.changeRequest.findUnique({
      where: { id: requestId },
      select: { applicantId: true },
    })
    if (!scope) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    if (scope.applicantId !== applicantId) {
      throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    }
    const result = await this.prisma.changeRequest.updateMany({
      where: { id: requestId, applicantId },
      data: { notificationReadAt: new Date() },
    })
    if (result.count === 0) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
  }

  private toDomain(row: {
    id: string
    applicationId: string
    eventId: string
    applicantId: string
    currentTermIds: string[]
    requestedTermIds: string[]
    kind: "TERMS" | "HEALTH"
    healthNote: string | null
    status: "PENDING" | "APPROVED" | "REJECTED"
    rejectionReason: string | null
    createdAt: Date
    reviewedAt: Date | null
    application: {
      firstName: string
      lastName: string
      gender: "FEMALE" | "MALE"
      email: string
      locale: "en" | "cs"
      terms: { termId: string; priceCzk: number }[]
      health: { note: string } | null
    }
    applicant: { locale: "en" | "cs"; applications: { locale: "en" | "cs" }[] }
    event: {
      name: string
      terms: { id: string; name: string | null; startsOn: Date; endsOn: Date; priceCzk: number }[]
    }
  }): ChangeRequest {
    const terms = row.event.terms.map((term) => ({
      ...term,
      priceCzk: row.currentTermIds.includes(term.id)
        ? (row.application.terms.find((item) => item.termId === term.id)?.priceCzk ?? term.priceCzk)
        : term.priceCzk,
    }))
    return {
      id: row.id,
      applicationId: row.applicationId,
      eventId: row.eventId,
      eventName: row.event.name,
      applicantId: row.applicantId,
      email: row.application.email,
      locale: resolveChangeEmailLocale({
        userLocale: row.applicant.locale,
        firstApplicationLocale: row.applicant.applications[0]?.locale ?? row.application.locale,
      }),
      participantName: `${row.application.firstName} ${row.application.lastName}`,
      participantGender: row.application.gender,
      currentTermIds: row.currentTermIds,
      requestedTermIds: row.requestedTermIds,
      kind: row.kind,
      currentHealthNote: row.kind === "HEALTH" ? (row.application.health?.note ?? null) : null,
      requestedHealthNote: row.healthNote,
      currentPriceCzk: selectionPriceCzk(row.currentTermIds, terms),
      requestedPriceCzk: selectionPriceCzk(row.requestedTermIds, terms),
      status: row.status,
      rejectionReason: row.rejectionReason,
      createdAt: row.createdAt,
      reviewedAt: row.reviewedAt,
      terms,
    }
  }
}
