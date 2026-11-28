import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { isMealsEditable } from "@/modules/applications/domain/edit-window"
import { todayInPrague } from "@/modules/applications/domain/waitlist-expiry"
import {
  decideSelection,
  KitchenTermInput,
  MealOption,
  OrganizerMeals,
  OwnMeals,
  SelectionInput,
} from "@/modules/meals/domain/meals"
import { toPragueWallTime } from "@/shared/domain/prague-wall-time"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

const ownSelect = {
  id: true,
  organizationId: true,
  eventId: true,
  firstName: true,
  lastName: true,
  allergies: true,
  specialRequest: true,
  noMealRestrictions: true,
  event: { select: { name: true } },
  mealOptions: { select: { id: true } },
  terms: { select: { status: true, term: { select: { endsOn: true, cancelledAt: true } } } },
} as const

const organizerSelect = ownSelect

function mealRecord(
  row: Prisma.ApplicationGetPayload<{ select: typeof ownSelect }>,
  options: MealOption[],
): OwnMeals {
  return {
    applicationId: row.id,
    eventName: row.event.name,
    firstName: row.firstName,
    lastName: row.lastName,
    options,
    selectedOptionIds: row.mealOptions.map((option) => option.id),
    allergies: row.allergies,
    specialRequest: row.specialRequest,
    noRestrictions: row.noMealRestrictions,
    // One rule for both roles and the server (D-192): until the last term that is not cancelled is over.
    editable: isMealsEditable(
      row.terms.map(({ status, term }) => ({
        status,
        endsOn: term.endsOn,
        cancelledAt: term.cancelledAt,
      })),
      todayInPrague(new Date()),
    ),
  }
}

const organizerRecord = mealRecord

/** The only place of the meal restrictions that touches the database. */
@Injectable()
export class MealsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listOptions(eventId: string): Promise<MealOption[]> {
    return this.prisma.mealOption.findMany({
      where: { eventId },
      orderBy: { position: "asc" },
      select: { id: true, name: true },
    })
  }

  /**
   * Replaces the event's list: options missing from `options` are deleted together with the
   * participants' ticks, the others keep their id and take the new name and order.
   */
  async replaceOptions(
    organizationId: string,
    eventId: string,
    options: { id?: string; name: string }[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.mealOption.findMany({ where: { eventId }, select: { id: true } })
      const existingIds = new Set(existing.map((option) => option.id))
      const keptIds = new Set(
        options.flatMap((option) => (option.id && existingIds.has(option.id) ? [option.id] : [])),
      )
      await tx.mealOption.deleteMany({
        where: { eventId, id: { in: [...existingIds].filter((id) => !keptIds.has(id)) } },
      })
      for (const [position, option] of options.entries()) {
        if (option.id && keptIds.has(option.id)) {
          await tx.mealOption.update({
            where: { id: option.id },
            data: { name: option.name, position },
          })
        } else {
          await tx.mealOption.create({
            data: { organizationId, eventId, name: option.name, position },
          })
        }
      }
    })
  }

  /** `null` when the application does not exist or is not attached to this account. */
  async findOfUser(userId: string, applicationId: string): Promise<OwnMeals | null> {
    const row = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
      select: ownSelect,
    })
    return row && mealRecord(row, await this.listOptions(row.eventId))
  }

  async organizerMeals(
    organizationId: string,
    eventId: string,
    id: string,
  ): Promise<OrganizerMeals | null> {
    const row = await this.prisma.application.findFirst({
      where: { id, organizationId, eventId },
      select: organizerSelect,
    })
    return row && organizerRecord(row, await this.listOptions(eventId))
  }

  async termRoster(
    organizationId: string,
    eventId: string,
    termId: string,
  ): Promise<OrganizerMeals[] | null> {
    const term = await this.prisma.term.findFirst({
      where: { id: termId, organizationId, eventId, cancelledAt: null },
      select: {
        applicationTerms: {
          where: { status: "CONFIRMED", application: { organizationId, eventId } },
          select: { application: { select: organizerSelect } },
          orderBy: [
            { application: { lastName: "asc" } },
            { application: { firstName: "asc" } },
            { applicationId: "asc" },
          ],
        },
      },
    })
    if (!term) return null
    const options = await this.listOptions(eventId)
    return term.applicationTerms.map(({ application }) => organizerRecord(application, options))
  }

  async saveOrganizerSelection(
    organizationId: string,
    eventId: string,
    id: string,
    input: SelectionInput,
  ): Promise<OrganizerMeals> {
    return this.prisma.$transaction(async (tx) => {
      // Match the lock order used by term changes and organizer edits.
      await tx.$queryRaw`SELECT id FROM event WHERE id = ${eventId} FOR UPDATE`
      await tx.$queryRaw`SELECT id FROM application WHERE id = ${id} AND "eventId" = ${eventId} FOR UPDATE`
      const where = { id, organizationId, eventId }
      const row = await tx.application.findFirst({ where, select: organizerSelect })
      if (!row) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      const options = await tx.mealOption.findMany({
        where: { eventId, organizationId },
        select: { id: true, name: true },
        orderBy: { position: "asc" },
      })
      if (!organizerRecord(row, options).editable)
        throw new AppException(HttpStatus.CONFLICT, "MEALS_EDIT_CLOSED")
      const decision = decideSelection(input, options)
      if (decision.kind === "invalid")
        throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
      const saved = await tx.application.update({
        where,
        select: organizerSelect,
        data: {
          allergies: decision.allergies,
          specialRequest: decision.specialRequest,
          noMealRestrictions: decision.noRestrictions,
          mealOptions: { set: decision.optionIds.map((optionId) => ({ id: optionId })) },
        },
      })
      return organizerRecord(saved, options)
    })
  }

  async findEventId(userId: string, applicationId: string): Promise<string | null> {
    const row = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
      select: { eventId: true },
    })
    return row?.eventId ?? null
  }

  async saveSelection(
    applicationId: string,
    optionIds: string[],
    allergies: string | null,
    specialRequest: string | null,
    noRestrictions: boolean,
  ): Promise<void> {
    await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        allergies,
        specialRequest,
        noMealRestrictions: noRestrictions,
        mealOptions: { set: optionIds.map((id) => ({ id })) },
      },
    })
  }

  /** Active terms of the event with the applications confirmed in them. */
  async kitchenTerms(organizationId: string, eventId: string): Promise<KitchenTermInput[]> {
    const terms = await this.prisma.term.findMany({
      where: { organizationId, eventId, cancelledAt: null },
      orderBy: [{ startsOn: "asc" }, { number: "asc" }],
      select: {
        id: true,
        name: true,
        startsOn: true,
        endsOn: true,
        applicationTerms: {
          where: { status: "CONFIRMED" },
          select: {
            lateArrivalAt: true,
            earlyDepartureAt: true,
            application: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                allergies: true,
                specialRequest: true,
                noMealRestrictions: true,
                mealOptions: { select: { id: true } },
              },
            },
          },
        },
      },
    })
    return terms.map((term) => ({
      termId: term.id,
      name: term.name,
      startsOn: term.startsOn,
      endsOn: term.endsOn,
      people: term.applicationTerms.map(({ application, lateArrivalAt, earlyDepartureAt }) => ({
        applicationId: application.id,
        firstName: application.firstName,
        lastName: application.lastName,
        allergies: application.allergies,
        specialRequest: application.specialRequest,
        noRestrictions: application.noMealRestrictions,
        optionIds: application.mealOptions.map((option) => option.id),
        lateArrival: lateArrivalAt && toPragueWallTime(lateArrivalAt),
        earlyDeparture: earlyDepartureAt && toPragueWallTime(earlyDepartureAt),
      })),
    }))
  }
}
