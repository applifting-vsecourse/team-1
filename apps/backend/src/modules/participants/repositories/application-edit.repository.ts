import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { isApplicationEditable } from "@/modules/applications/domain/application-editable"
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
  pronouns: string | null
  birthDate: string
  phone: string | null
  individualAccommodation: boolean
  accommodationRequest: string | null
  history: { id: string; createdAt: string; authorName: string; changedFields: string[] }[]
}

export type EditInput = Pick<
  EditableApplication,
  | "firstName"
  | "lastName"
  | "pronouns"
  | "birthDate"
  | "phone"
  | "individualAccommodation"
  | "accommodationRequest"
>

/** Whose application it is: the applicant's own, or any application of the organizer's organization. */
export type EditScope = { userId: string } | { organizationId: string }

/** Who saves the edit; the audit record carries the name. */
export type Editor = { id: string; name: string }

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
  pronouns: row.pronouns,
  birthDate: row.birthDate.toISOString().slice(0, 10),
  phone: row.phone,
  individualAccommodation: row.individualAccommodation,
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

  /**
   * Serializes edits to the same application and stores the audit record with the change.
   * `null` when the application is outside `scope`.
   */
  async save(
    scope: EditScope,
    editor: Editor,
    id: string,
    input: Omit<EditInput, "pronouns"> & { pronouns?: string | null },
  ): Promise<EditableApplication | null> {
    return this.prisma.$transaction(async (tx) => {
      const target = await tx.application.findFirst({
        where: { id, ...scope },
        select: { eventId: true },
      })
      if (!target) return null
      // Submission and term changes use the event lock for the duplicate check too.
      await tx.$queryRaw`SELECT id FROM event WHERE id = ${target.eventId} FOR UPDATE`
      await tx.$queryRaw`SELECT id FROM "application" WHERE id = ${id} FOR UPDATE`
      const row = await tx.application.findFirst({ where: { id, ...scope }, include })
      if (!row) return null

      // Only an application with a live term can be edited: a cancelled one, or one whose terms
      // are all over, is history.
      const terms = await tx.applicationTerm.findMany({
        where: { applicationId: id },
        select: { termId: true, status: true, term: { select: { endsOn: true } } },
      })
      const today = todayInPrague(new Date())
      if (
        !isApplicationEditable(
          terms.map(({ status, term }) => ({ status, endsOn: term.endsOn })),
          today,
        )
      ) {
        throw new AppException(HttpStatus.CONFLICT, "APPLICATION_NOT_EDITABLE")
      }
      const activeTerms = terms.filter(({ status }) => status !== "CANCELLED")

      const before: EditInput = {
        firstName: row.firstName,
        lastName: row.lastName,
        pronouns: row.pronouns,
        birthDate: row.birthDate.toISOString().slice(0, 10),
        phone: row.phone,
        individualAccommodation: row.individualAccommodation,
        accommodationRequest: row.accommodationRequest,
      }
      const after: EditInput = {
        ...input,
        pronouns: input.pronouns === undefined ? before.pronouns : input.pronouns,
      }
      const changedFields = (Object.keys(after) as (keyof EditInput)[]).filter(
        (field) => before[field] !== after[field],
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
          pronouns: after.pronouns,
          birthDate: new Date(`${input.birthDate}T00:00:00.000Z`),
          phone: input.phone,
          individualAccommodation: input.individualAccommodation,
          accommodationRequest: input.accommodationRequest,
        },
      })
      const edit = await tx.applicationEdit.create({
        data: {
          organizationId: row.organizationId,
          applicationId: id,
          changedById: editor.id,
          authorName: editor.name,
          changedFields,
          before: before as Prisma.InputJsonObject,
          after: after as Prisma.InputJsonObject,
        },
      })
      // Only an applicant's edit notifies the organizers (D-141); an organizer's own change tells nobody.
      if ("userId" in scope) {
        await this.notifications.notifyOrganizersOfApplicationEdit(tx, {
          organizationId: row.organizationId,
          applicationId: id,
          eventId: row.eventId,
          eventName: row.event.name,
          participantName: `${input.firstName} ${input.lastName}`,
        })
      }
      const updated = toDto((await tx.application.findFirst({ where: { id, ...scope }, include }))!)
      // Two edits can share a millisecond; the response must show this save first.
      updated.history.sort((a, b) => (a.id === edit.id ? -1 : b.id === edit.id ? 1 : 0))
      return updated
    })
  }
}
