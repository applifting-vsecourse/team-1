export type SendEmailOptions = {
  /** The same key for every attempt to deliver one message; ignored by providers without it. */
  idempotencyKey?: string
}

export interface EmailService {
  /** True when a repeated send with the same key and content is delivered only once. */
  readonly isIdempotent?: boolean
  /** Throws when the e-mail was not handed over; see `EmailDeliveryError`. */
  sendEmail(to: string, subject: string, html: string, options?: SendEmailOptions): Promise<void>
}
