import { NewEmailJob } from "@/core/email/queue/email-job.repository"
import { PaymentReceivedEmailProps } from "@/core/email/templates/payment-received"
import {
  ApplicationChange,
  TermCancelledNotice,
} from "@/modules/participants/domain/submission-confirmation"

/** E-mail no. 8 (US-117) as the payments module hands it over. */
export type PaymentReceivedMessage = { email: string; accessToken: string } & Omit<
  PaymentReceivedEmailProps,
  "confirmationUrl"
>

/**
 * The e-mails a bulk action puts in the queue instead of sending them in the request (#737).
 * `basis` is what the message announces: when it no longer holds, the message is not sent.
 */
export type QueuedEmail =
  | {
      template: "APPLICATION_CHANGE"
      data: ApplicationChange
      basis: { statusChangeId: string }
    }
  | { template: "TERM_CANCELLED"; data: TermCancelledNotice }
  | {
      template: "PAYMENT_RECEIVED"
      data: PaymentReceivedMessage
      /** `settledTermIds` are application terms. */
      basis: { receiptId: string; settledTermIds: string[] }
    }

export function queuedEmailJob(
  about: { organizationId: string; eventId: string; applicationId: string },
  dedupeKey: string,
  { template, ...payload }: QueuedEmail,
): NewEmailJob {
  return {
    ...about,
    dedupeKey,
    template,
    recipient: payload.data.email,
    locale: payload.data.locale,
    data: payload,
  }
}
