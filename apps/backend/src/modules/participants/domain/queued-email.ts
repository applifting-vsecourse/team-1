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

/** The e-mails a bulk action puts in the queue instead of sending them in the request (#737). */
export type QueuedEmail =
  | { template: "APPLICATION_CHANGE"; data: ApplicationChange }
  | { template: "TERM_CANCELLED"; data: TermCancelledNotice }
  | { template: "PAYMENT_RECEIVED"; data: PaymentReceivedMessage }

export function queuedEmailJob(
  about: { organizationId: string; eventId: string; applicationId: string },
  dedupeKey: string,
  email: QueuedEmail,
): NewEmailJob {
  return {
    ...about,
    dedupeKey,
    template: email.template,
    recipient: email.data.email,
    locale: email.data.locale,
    data: email.data,
  }
}
