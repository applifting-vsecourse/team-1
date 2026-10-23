import { EmailService } from "@/core/email/interfaces/email-service.interface"
import { renderEmail } from "@/core/email/render"
import {
  ApplicationChange as ApplicationChangeEmail,
  applicationChangeSubject,
} from "@/core/email/templates/application-change"
import {
  ApplicationConfirmation as ApplicationConfirmationEmail,
  applicationConfirmationSubject,
} from "@/core/email/templates/application-confirmation"
import {
  buildChangeProps,
  buildConfirmationApplications,
  loginUrl,
} from "@/modules/participants/domain/confirmation-email"
import {
  ApplicationChange,
  SubmissionConfirmation,
} from "@/modules/participants/domain/submission-confirmation"
import { MagicLinkService } from "@/shared/auth/services/magic-link.service"
import { Config } from "@/shared/config/config.service"
import { Inject, Injectable, Logger } from "@nestjs/common"

/**
 * Contract between stream B (application) and stream C (e-mail), US-56.
 *
 * - `sendSubmissionConfirmation`: ONE summary e-mail per submission of the
 *   form, however many participants were signed up. B calls it once, after
 *   every application of the submission is stored.
 * - `sendApplicationChange`: one e-mail about one changed application; the
 *   callers (US-28, 32, 33, 34, 84) are added with those stories.
 *
 * A failed delivery never fails the caller: the error is logged (recipient
 * address only) and the method returns normally.
 */
@Injectable()
export class ApplicationConfirmationMailer {
  private readonly logger = new Logger(ApplicationConfirmationMailer.name)

  constructor(
    @Inject("EmailService") private readonly email: EmailService,
    private readonly magicLinks: MagicLinkService,
    private readonly config: Config,
  ) {}

  async sendSubmissionConfirmation(confirmation: SubmissionConfirmation): Promise<void> {
    try {
      const access = await this.accessLink(confirmation)
      const html = await renderEmail(ApplicationConfirmationEmail, {
        locale: confirmation.locale,
        eventName: confirmation.eventName,
        access,
        applications: buildConfirmationApplications(confirmation, this.config.frontendUrl),
      })
      await this.email.sendEmail(
        confirmation.email,
        applicationConfirmationSubject(confirmation.locale, confirmation.eventName),
        html,
      )
    } catch (error) {
      this.logFailure("confirmation", confirmation.email, error)
    }
  }

  async sendApplicationChange(change: ApplicationChange): Promise<void> {
    try {
      const html = await renderEmail(
        ApplicationChangeEmail,
        buildChangeProps(change, this.config.frontendUrl),
      )
      await this.email.sendEmail(
        change.email,
        applicationChangeSubject(change.locale, change.eventName),
        html,
      )
    } catch (error) {
      this.logFailure("change", change.email, error)
    }
  }

  /**
   * An account without a password gets a magic link, one with a password the
   * sign-in page. When no link can be issued the sign-in page stands in.
   */
  private async accessLink(
    confirmation: SubmissionConfirmation,
  ): Promise<{ kind: "MAGIC_LINK" | "LOGIN"; url: string }> {
    const login = { kind: "LOGIN" as const, url: loginUrl(this.config.frontendUrl) }
    if (!confirmation.mustSetPassword) return login

    const url = await this.magicLinks.createLink(confirmation.email).catch(() => null)
    if (!url) {
      this.logger.warn(
        `No magic link for ${confirmation.email}, the e-mail links to the sign-in page instead`,
      )
      return login
    }
    return { kind: "MAGIC_LINK", url }
  }

  private logFailure(kind: string, recipient: string, error: unknown): void {
    const reason = error instanceof Error ? error.message : "unknown error"
    this.logger.error(`Could not send the ${kind} e-mail to ${recipient}: ${reason}`)
  }
}
