import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import {
  ChangeRequest,
  sameSelection,
  selectionPriceCzk,
} from "@/modules/applications/domain/change-request"
import { participantChangeAllowed } from "@/modules/applications/domain/participant-term-change"
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
        where: { applicationId, status: "PENDING" },
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

  async forParticipant(applicantId: string, applicationId: string): Promise<ChangeRequest[]> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, userId: applicantId },
      select: { id: true },
    })
    if (!application) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    const rows = await this.prisma.changeRequest.findMany({
      where: { applicationId, applicantId },
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
