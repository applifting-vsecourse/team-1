import { PrismaService } from "@/core/prisma/prisma.service"
import { KitchenTermInput, MealOption, OwnMeals } from "@/modules/meals/domain/meals"
import { Injectable } from "@nestjs/common"

const ownSelect = {
  id: true,
  organizationId: true,
  eventId: true,
  firstName: true,
  lastName: true,
  allergies: true,
  event: { select: { name: true } },
  mealOptions: { select: { id: true } },
} as const

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
    if (!row) return null
    return {
      applicationId: row.id,
      eventName: row.event.name,
      firstName: row.firstName,
      lastName: row.lastName,
      options: await this.listOptions(row.eventId),
      selectedOptionIds: row.mealOptions.map((option) => option.id),
      allergies: row.allergies,
    }
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
  ): Promise<void> {
    await this.prisma.application.update({
      where: { id: applicationId },
      data: { allergies, mealOptions: { set: optionIds.map((id) => ({ id })) } },
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
            application: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                allergies: true,
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
      people: term.applicationTerms.map(({ application }) => ({
        applicationId: application.id,
        firstName: application.firstName,
        lastName: application.lastName,
        allergies: application.allergies,
        optionIds: application.mealOptions.map((option) => option.id),
      })),
    }))
  }
}
