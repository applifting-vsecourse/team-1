import { ApplicationConfirmation } from "@/modules/participants/domain/application-confirmation"
import { Injectable } from "@nestjs/common"

/**
 * Contract between stream B (application) and stream C (e-mail). B calls
 * `send` after the application is stored; C implements it in US-56 (template
 * in core/email/templates, magic link from US-01). No-op until then.
 */
@Injectable()
export class ApplicationConfirmationMailer {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async send(confirmation: ApplicationConfirmation): Promise<void> {
    // TODO(US-56): render and send the confirmation e-mail.
  }
}
