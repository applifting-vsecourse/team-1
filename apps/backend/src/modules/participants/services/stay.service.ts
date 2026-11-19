import { decideStay, StayInput } from "@/modules/participants/domain/stay"
import { StayRepository } from "@/modules/participants/repositories/stay.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

/** US-143: a participant gives a later arrival or an earlier departure in a term. */
@Injectable()
export class StayService {
  constructor(private readonly stays: StayRepository) {}

  /** Both `null` deletes the data. Never touches the price, debt, capacity or status. */
  async save(
    user: Identity,
    applicationId: string,
    termId: string,
    input: StayInput,
  ): Promise<void> {
    const target = await this.stays.findTarget(user.id, applicationId, termId)
    if (target.kind === "NOT_FOUND") {
      throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Not your application")
    }
    if (target.kind === "NOT_AVAILABLE") {
      throw new AppException(HttpStatus.CONFLICT, "STAY_NOT_AVAILABLE")
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
        await this.stays.save(target.id, decision.lateArrivalAt, decision.earlyDepartureAt)
    }
  }
}
