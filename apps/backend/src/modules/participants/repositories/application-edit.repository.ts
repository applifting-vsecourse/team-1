import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { findDuplicate } from "@/modules/applications/domain/duplicate-application"
import { termLabel } from "@/modules/applications/domain/term-label"
import { todayInPrague } from "@/modules/applications/domain/waitlist-expiry"
import { NotificationsRepository } from "@/modules/notifications/repositories/notifications.repository"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

export type EditableApplication = {
  id: string
  eventName: string
  firstName: string
  lastName: string
  birthDate: string
  phone: string | null
  accommodationRequest: string | null
  history: { id: string; createdAt: string; authorName: string; changedFields: string[] }[]
}

export type EditInput = Pick<
  EditableApplication,
  "firstName" | "lastName" | "birthDate" | "phone" | "accommodationRequest"
>

const include = {
  event: { select: { name: true } },
  edits: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50 },
} as const satisfies Prisma.ApplicationInclude

type Row = Prisma.ApplicationGetPayload<{ include: typeof include }>

const toDto = (row: Row): EditableApplication => ({
  id: row.id,
  eventName: row.event.name,
  firstName: row.firstName,
  lastName: row.lastName,
  birthDate: row.birthDate.toISOString().slice(0, 10),
  phone: row.phone,
  accommodationRequest: row.accommodationRequest,
  history: row.edits.map((edit) => ({
    id: edit.id,
    createdAt: edit.createdAt.toISOString(),
    authorName: edit.authorName,
    changedFields: edit.changedFields,
  })),
})

@Injectable()
export class ApplicationEditRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsRepository,
  ) {}

  async findOneOfUser(userId: string, id: string): Promise<EditableApplication | null> {
    const row = await this.prisma.application.findFirst({ where: { id, userId }, include })
    return row ? toDto(row) : null
  }

  /** Serializes edits to the same application and stores the audit record with the change. */
  async save(
    userId: string,
    authorName: string,
    id: string,
    input: EditInput,
  ): Promise<EditableApplication | null> {
    return this.prisma.$transaction(async (tx) => {
      const target = await tx.application.findFirst({
        where: { id, userId },
        select: { eventId: true },
      })
      if (!target) return null
      // Submission and term changes use the event lock for the duplicate check too.
      await tx.$queryRaw`SELECT id FROM event WHERE id = ${target.eventId} FOR UPDATE`
      await tx.$queryRaw`SELECT id FROM "application" WHERE id = ${id} FOR UPDATE`
      const row = await tx.application.findFirst({ where: { id, userId }, include })
      if (!row) return null

      // Only an application with a live term can be edited: a cancelled one, or one whose terms
      // are all over, is history.
      const activeTerms = await tx.applicationTerm.findMany({
        where: { applicationId: id, status: { not: "CANCELLED" } },
        select: { termId: true, term: { select: { endsOn: true } } },
      })
      const today = todayInPrague(new Date())
      if (!activeTerms.some(({ term }) => term.endsOn >= today)) {
        throw new AppException(HttpStatus.CONFLICT, "APPLICATION_NOT_EDITABLE")
      }

      const before: EditInput = {
        firstName: row.firstName,
        lastName: row.lastName,
        birthDate: row.birthDate.toISOString().slice(0, 10),
        phone: row.phone,
        accommodationRequest: row.accommodationRequest,
      }
      const changedFields = (Object.keys(input) as (keyof EditInput)[]).filter(
        (field) => before[field] !== input[field],
      )
      if (changedFields.length === 0) return toDto(row)

      if (changedFields.some((field) => ["firstName", "lastName", "birthDate"].includes(field))) {
        const termIds = activeTerms.map(({ termId }) => termId)
        if (termIds.length > 0) {
          const registered = await tx.applicationTerm.findMany({
            where: {
              organizationId: row.organizationId,
              termId: { in: termIds },
              status: { not: "CANCELLED" },
              applicationId: { not: id },
              application: {
                eventId: row.eventId,
                birthDate: new Date(`${input.birthDate}T00:00:00.000Z`),
              },
            },
            select: {
              termId: true,
              application: { select: { firstName: true, lastName: true, birthDate: true } },
            },
          })
          const duplicate = findDuplicate(
            registered.map(({ termId, application }) => ({
              termId,
              firstName: application.firstName,
              lastName: application.lastName,
              birthDate: application.birthDate.toISOString().slice(0, 10),
            })),
            [
              {
                firstName: input.firstName,
                lastName: input.lastName,
                birthDate: input.birthDate,
                termIds,
              },
            ],
          )
          if (duplicate) {
            const term = await tx.term.findUniqueOrThrow({
              where: { id: duplicate.termId },
              select: { name: true, startsOn: true, endsOn: true },
            })
            throw new AppException(HttpStatus.CONFLICT, "APPLICATION_DUPLICATE", undefined, {
              participant: `${input.firstName} ${input.lastName}`,
              term: termLabel(term, row.locale),
            })
          }
        }
      }

      await tx.application.update({
        where: { id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          birthDate: new Date(`${input.birthDate}T00:00:00.000Z`),
          phone: input.phone,
          accommodationRequest: input.accommodationRequest,
        },
      })
      const edit = await tx.applicationEdit.create({
        data: {
          organizationId: row.organizationId,
          applicationId: id,
          changedById: userId,
          authorName,
          changedFields,
          before: before as Prisma.InputJsonObject,
          after: input as Prisma.InputJsonObject,
        },
      })
      await this.notifications.notifyOrganizersOfApplicationEdit(tx, {
        organizationId: row.organizationId,
        applicationId: id,
        eventId: row.eventId,
        eventName: row.event.name,
        participantName: `${input.firstName} ${input.lastName}`,
      })
      const updated = toDto((await tx.application.findFirst({ where: { id, userId }, include }))!)
      // Two edits can share a millisecond; the response must show this save first.
      updated.history.sort((a, b) => (a.id === edit.id ? -1 : b.id === edit.id ? 1 : 0))
      return updated
    })
  }
}
