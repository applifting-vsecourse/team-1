import { EmailService } from "@/core/email/interfaces/email-service.interface"
import { renderEmail } from "@/core/email/render"
import {
  ChangeEmailNotice,
  changeEmailNoticeSubject,
} from "@/core/email/templates/change-email-notice"
import { AccountRepository } from "@/modules/account/repositories/account.repository"
import { Identity } from "@/shared/auth/domain/identity"
import type { BetterAuth } from "@/shared/auth/providers/better-auth.provider"
import { Config } from "@/shared/config/config.service"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Inject, Injectable, Logger } from "@nestjs/common"

/** The page the e-mail link ends on (frontend `ROUTES.emailChange`); BetterAuth adds `?error=` when the link fails. */
export const EMAIL_CHANGE_LANDING_PATH = "/email-change"

/**
 * US-125: the signed-in user asks for a new sign-in e-mail. BetterAuth sends the
 * link to the new address and applies the change only after it is clicked, so
 * until then the account keeps the old e-mail. The user comes from the session.
 */
@Injectable()
export class EmailChangeService {
  private readonly logger = new Logger(EmailChangeService.name)

  constructor(
    private readonly repository: AccountRepository,
    @Inject("BetterAuth") private readonly auth: BetterAuth,
    private readonly config: Config,
    @Inject("EmailService") private readonly email: EmailService,
  ) {}

  /**
   * An address that already signs in to an account (the current one, another participant's
   * or an organizer's) is refused with `EMAIL_TAKEN` and nothing is sent (PO, #218).
   * BetterAuth itself would answer „ok“ without sending. The old address gets a notice
   * that a change was requested (security).
   */
  async requestChange(user: Identity, newEmail: string, headers: Headers): Promise<void> {
    const email = newEmail.trim().toLowerCase()
    if (email === user.email.toLowerCase() || (await this.repository.isEmailTaken(email))) {
      throw new AppException(HttpStatus.BAD_REQUEST, "EMAIL_TAKEN")
    }

    try {
      await this.auth.api.changeEmail({
        body: {
          newEmail: email,
          callbackURL: `${this.config.frontendUrl}${EMAIL_CHANGE_LANDING_PATH}`,
        },
        headers,
      })
    } catch (error) {
      // A refusal by BetterAuth (4xx) is the caller's input; anything else is a failed delivery.
      const status = (error as { statusCode?: unknown }).statusCode
      if (typeof status === "number" && status >= 400 && status < 500) {
        throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
      }
      // The e-mail could not be sent (e.g. the mail service refuses the address): say so, not „internal error“.
      throw new AppException(HttpStatus.BAD_GATEWAY, "EMAIL_DELIVERY_FAILED")
    }

    await this.notifyOldAddress(user, email)
  }

  /** A failed notice must not fail the change: the link to the new address is already out. */
  private async notifyOldAddress(user: Identity, newEmail: string): Promise<void> {
    try {
      const html = await renderEmail(ChangeEmailNotice, { locale: user.locale, newEmail })
      await this.email.sendEmail(user.email, changeEmailNoticeSubject(user.locale), html)
    } catch (error) {
      this.logger.warn(
        `Notice about an e-mail change to ${user.email} was not sent: ${String(error)}`,
      )
    }
  }
}
