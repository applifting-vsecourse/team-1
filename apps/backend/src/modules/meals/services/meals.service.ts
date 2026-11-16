import {
  decideOptions,
  decideSelection,
  kitchenSummary,
  KitchenTermSummary,
  MealOption,
  MealOptionInput,
  OwnMeals,
  SelectionInput,
} from "@/modules/meals/domain/meals"
import { MealsRepository } from "@/modules/meals/repositories/meals.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { HttpStatus, Injectable } from "@nestjs/common"

/**
 * US-64: the organizer defines the meal restrictions of an event, the account that submitted the
 * application ticks them for the participant and writes the allergies, the organizer reads the
 * counts per term for the kitchen.
 */
@Injectable()
export class MealsService {
  constructor(
    private readonly meals: MealsRepository,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  async listOptions(user: Identity, eventId: string): Promise<MealOption[]> {
    await this.organizationAccess.assertCanAccessEvent(user, eventId)
    return this.meals.listOptions(eventId)
  }

  async saveOptions(
    user: Identity,
    eventId: string,
    inputs: MealOptionInput[],
  ): Promise<MealOption[]> {
    const { organizationId } = await this.organizationAccess.assertCanAccessEvent(user, eventId)
    const decision = decideOptions(inputs)
    if (decision.kind === "invalid") {
      throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Invalid meal options")
    }
    await this.meals.replaceOptions(organizationId, eventId, decision.options)
    return this.meals.listOptions(eventId)
  }

  async kitchenSummary(user: Identity, eventId: string): Promise<KitchenTermSummary[]> {
    const { organizationId } = await this.organizationAccess.assertCanAccessEvent(user, eventId)
    const [terms, options] = await Promise.all([
      this.meals.kitchenTerms(organizationId, eventId),
      this.meals.listOptions(eventId),
    ])
    return kitchenSummary(terms, options)
  }

  /** Someone else's application and a missing one look the same: 403 with no content. */
  async getOwn(user: Identity, applicationId: string): Promise<OwnMeals> {
    const meals = await this.meals.findOfUser(user.id, applicationId)
    if (!meals) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Not your application")
    return meals
  }

  async saveOwn(user: Identity, applicationId: string, input: SelectionInput): Promise<OwnMeals> {
    const current = await this.getOwn(user, applicationId)
    const decision = decideSelection(input, current.options)
    if (decision.kind === "invalid") {
      throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Invalid meal selection")
    }
    await this.meals.saveSelection(
      applicationId,
      decision.optionIds,
      decision.allergies,
      decision.specialRequest,
    )
    return this.getOwn(user, applicationId)
  }
}
