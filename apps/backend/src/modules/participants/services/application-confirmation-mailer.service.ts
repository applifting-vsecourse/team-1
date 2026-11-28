import { EmailService } from "@/core/email/interfaces/email-service.interface"
import { EmailContent } from "@/core/email/queue/email-job.repository"
import { renderEmail } from "@/core/email/render"
import {
  ApplicationChange as ApplicationChangeEmail,
  applicationChangeSubject,
} from "@/core/email/templates/application-change"
import {
  ConfirmationWithdrawn,
  confirmationWithdrawnSubject,
} from "@/core/email/templates/application-change-confirmation-withdrawn"
import {
  ApplicationConfirmation as ApplicationConfirmationEmail,
  applicationConfirmationSubject,
} from "@/core/email/templates/application-confirmation"
import {
  TermCancelled,
  termCancelledSubject,
} from "@/core/email/templates/application-term-cancelled"
import {
  ChangeRequestStatus,
  ChangeRequestStatusProps,
  changeRequestStatusSubject,
} from "@/core/email/templates/change-request-status"
import {
  PaymentCorrectionEmail,
  PaymentCorrectionEmailProps,
  paymentCorrectionSubject,
} from "@/core/email/templates/payment-correction"
import {
  PaymentReceivedEmail,
  paymentReceivedSubject,
} from "@/core/email/templates/payment-received"
import {
  buildChangeProps,
  buildConfirmationApplications,
  buildTermNoticeProps,
  confirmationUrl,
  loginUrl,
} from "@/modules/participants/domain/confirmation-email"
import { PaymentReceivedMessage, QueuedEmail } from "@/modules/participants/domain/queued-email"
import {
  ApplicationChange,
  SubmissionConfirmation,
  TermCancelledNotice,
} from "@/modules/participants/domain/submission-confirmation"
import { MagicLinkService } from "@/shared/auth/services/magic-link.service"
import { Config } from "@/shared/config/config.service"
import { Inject, Injectable, Logger } from "@nestjs/common"

/**
 * Contract between the applications module and the e-mails, US-56.
 *
 * - `sendSubmissionConfirmation`: ONE summary e-mail per submission of the
 *   form, however many participants were signed up. The applications module
 *   calls it once, after every application of the submission is stored.
 * - `sendApplicationChange`: one e-mail about one changed application; the
 *   callers are the status changes of an organizer (US-28, US-102) and the system (US-106);
 *   the applicant's cancellation (no. 11, US-84) is added with its story.
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
        organizationName: confirmation.organizationName,
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
    await this.send("change", change.email, () => this.renderApplicationChange(change))
  }

  /** E-mail no. 15 (US-131): one per application cancelled with its term, without payment details. */
  async sendTermCancelled(notice: TermCancelledNotice): Promise<void> {
    await this.send("term cancelled", notice.email, () => this.renderTermCancelled(notice))
  }

  /** The message of a queued e-mail (#737). Throws, so the queue records the failure. */
  async renderQueued(queued: QueuedEmail): Promise<EmailContent> {
    switch (queued.template) {
      case "APPLICATION_CHANGE":
        return this.renderApplicationChange(queued.data)
      case "TERM_CANCELLED":
        return this.renderTermCancelled(queued.data)
      case "PAYMENT_RECEIVED":
        return this.renderPaymentReceived(queued.data)
    }
  }

  async sendChangeRequestStatus(email: string, details: ChangeRequestStatusProps): Promise<void> {
    try {
      const html = await renderEmail(ChangeRequestStatus, details)
      await this.email.sendEmail(email, changeRequestStatusSubject(details.locale), html)
    } catch (error) {
      this.logFailure("change request", email, error)
    }
  }

  async sendPaymentCorrection(
    input: { email: string; accessToken: string } & Omit<
      PaymentCorrectionEmailProps,
      "confirmationUrl"
    >,
  ): Promise<void> {
    try {
      const html = await renderEmail(PaymentCorrectionEmail, {
        ...input,
        confirmationUrl: `${this.config.frontendUrl}/apply/confirmation/${encodeURIComponent(input.accessToken)}`,
      })
      await this.email.sendEmail(
        input.email,
        paymentCorrectionSubject(input.locale, input.eventName),
        html,
      )
    } catch (error) {
      this.logFailure("payment correction", input.email, error)
    }
  }

  /** E-mail no. 8 (US-117): one per application for all terms settled by the payment; carries no amount. */
  async sendPaymentReceived(input: PaymentReceivedMessage): Promise<void> {
    await this.send("payment received", input.email, () => this.renderPaymentReceived(input))
  }

  private async send(
    kind: string,
    recipient: string,
    render: () => Promise<EmailContent>,
  ): Promise<void> {
    try {
      const { subject, html } = await render()
      await this.email.sendEmail(recipient, subject, html)
    } catch (error) {
      this.logFailure(kind, recipient, error)
    }
  }

  private async renderApplicationChange(change: ApplicationChange): Promise<EmailContent> {
    // No. 13 has a template of its own (D-074), the others share one.
    const { kind } = change
    if (kind === "WAITLISTED_AFTER_CONFIRMED") {
      return {
        subject: confirmationWithdrawnSubject(change.locale, change.eventName),
        html: await renderEmail(
          ConfirmationWithdrawn,
          buildTermNoticeProps(change, this.config.frontendUrl),
        ),
      }
    }
    return {
      subject: applicationChangeSubject(change.locale, change.eventName, kind),
      html: await renderEmail(
        ApplicationChangeEmail,
        buildChangeProps({ ...change, kind }, this.config.frontendUrl),
      ),
    }
  }

  private async renderTermCancelled(notice: TermCancelledNotice): Promise<EmailContent> {
    return {
      subject: termCancelledSubject(notice.locale, notice.eventName),
      html: await renderEmail(TermCancelled, {
        locale: notice.locale,
        eventName: notice.eventName,
        organizationName: notice.organizationName,
        name: `${notice.firstName} ${notice.lastName}`,
        gender: notice.gender,
        term: notice.termName,
        confirmationUrl: confirmationUrl(this.config.frontendUrl, notice.accessToken),
      }),
    }
  }

  private async renderPaymentReceived(input: PaymentReceivedMessage): Promise<EmailContent> {
    return {
      subject: paymentReceivedSubject(input.locale, input.eventName),
      html: await renderEmail(PaymentReceivedEmail, {
        ...input,
        confirmationUrl: `${this.config.frontendUrl}/apply/confirmation/${encodeURIComponent(input.accessToken)}`,
      }),
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
