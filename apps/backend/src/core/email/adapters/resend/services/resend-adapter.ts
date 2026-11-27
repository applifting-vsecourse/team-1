import { ResendConfig } from "@/core/email/adapters/resend/interfaces/resend-config.interface"
import { DeliveryOutcome, EmailDeliveryError } from "@/core/email/interfaces/email-delivery.error"
import { EmailService, SendEmailOptions } from "@/core/email/interfaces/email-service.interface"
import { Injectable, Logger } from "@nestjs/common"
import { Resend } from "resend"

@Injectable()
export class ResendAdapter implements EmailService {
  /** Resend remembers an `Idempotency-Key` for 24 hours. */
  readonly isIdempotent = true
  private readonly logger = new Logger(ResendAdapter.name)
  private readonly client: Resend

  constructor(private readonly config: ResendConfig) {
    this.client = new Resend(config.apiKey)
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    options: SendEmailOptions = {},
  ): Promise<void> {
    const { error } = await this.client.emails.send(
      { from: this.config.from, to, subject, html },
      { idempotencyKey: options.idempotencyKey },
    )

    if (error) {
      this.logger.error(`Resend delivery failed: ${error.message}`, error)
      throw new EmailDeliveryError(`Resend delivery failed: ${error.message}`, outcomeOf(error))
    }
  }
}

/** The SDK reports a lost connection as an error without a status code. */
function outcomeOf(error: { name: string; statusCode: number | null }): DeliveryOutcome {
  if (error.name === "invalid_idempotent_request") return "CONFLICT"
  // Another attempt with the key is still running, so its result is not known yet.
  if (error.name === "concurrent_idempotent_requests") return "UNKNOWN"
  return error.statusCode === null || error.statusCode >= 500 ? "UNKNOWN" : "NOT_SENT"
}
