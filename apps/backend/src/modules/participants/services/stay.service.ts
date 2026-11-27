import { ApplicationScope, editorOf } from "@/modules/applications/domain/application-scope"
import { isEditWindowOpen } from "@/modules/applications/domain/edit-window"
import { todayInPrague } from "@/modules/applications/domain/waitlist-expiry"
import { decideStay, StayInput } from "@/modules/participants/domain/stay"
import { StayRepository } from "@/modules/participants/repositories/stay.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { HttpStatus, Injectable } from "@nestjs/common"

/**
 * US-143: a participant gives a later arrival or an earlier departure in a term. The organizer
 * can write the same for the participant (D-191, #788), with the same rules.
 */
@Injectable()
export class StayService {
  constructor(
    private readonly stays: StayRepository,
    private readonly access: OrganizationAccessService,
  ) {}

  /** Both `null` deletes the data. Never touches the price, debt, capacity or status. */
  async save(
    user: Identity,
    applicationId: string,
    termId: string,
    input: StayInput,
  ): Promise<void> {
    await this.write({ userId: user.id }, applicationId, termId, input)
  }

  /** An organizer of the application's organization writes it; the history records who. */
  async saveByOrganizer(
    user: Identity,
    applicationId: string,
    termId: string,
    input: StayInput,
  ): Promise<void> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    await this.write({ organizationId }, applicationId, termId, input, editorOf(user))
  }

  private async write(
    scope: ApplicationScope,
    applicationId: string,
    termId: string,
    input: StayInput,
    editor?: ReturnType<typeof editorOf>,
  ): Promise<void> {
    const target = await this.stays.findTarget(scope, applicationId, termId)
    if (target.kind === "NOT_FOUND") {
      throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Not your application")
    }
    if (target.kind === "NOT_AVAILABLE") {
      throw new AppException(HttpStatus.CONFLICT, "STAY_NOT_AVAILABLE")
    }
    if (!isEditWindowOpen(target.endsOn, todayInPrague(new Date()))) {
      throw new AppException(HttpStatus.CONFLICT, "TERM_EDIT_CLOSED")
    }
    const decision = decideStay(input, target)
    switch (decision.kind) {
      case "invalid":
        throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
      case "arrival_outside_term":
        throw new AppException(HttpStatus.BAD_REQUEST, "STAY_ARRIVAL_OUTSIDE_TERM")
      case "departure_outside_term":
        throw new AppException(HttpStatus.BAD_REQUEST, "STAY_DEPARTURE_OUTSIDE_TERM")
      case "departure_not_after_arrival":
        throw new AppException(HttpStatus.BAD_REQUEST, "STAY_DEPARTURE_NOT_AFTER_ARRIVAL")
      case "ok":
        await this.stays.save(target, decision.lateArrivalAt, decision.earlyDepartureAt, editor)
    }
  }
}
