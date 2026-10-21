import { isValidPassword } from "@/modules/participants/domain/password"
import { ParticipantAccountsRepository } from "@/modules/participants/repositories/participant-accounts.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

/**
 * US-04: the participant who entered by magic link chooses their own password.
 * The endpoint cannot use the participant guard — it refuses exactly the
 * participants who still have to set a password — so the account type is
 * checked here.
 */
@Injectable()
export class ParticipantPasswordService {
  constructor(private readonly accounts: ParticipantAccountsRepository) {}

  async setPassword(user: Identity, password: unknown): Promise<void> {
    if (user.accountType !== "PARTICIPANT") {
      throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Only for participant accounts")
    }
    if (!user.mustSetPassword) {
      throw new AppException(
        HttpStatus.CONFLICT,
        "PASSWORD_ALREADY_SET",
        "The password is already set",
      )
    }
    if (!isValidPassword(password)) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        "VALIDATION_FAILED",
        "The password must have at least 8 characters",
      )
    }
    await this.accounts.setPassword(user.id, password)
  }
}
