import { Locale } from "@/core/email/locale"
import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"

/** Everything the confirmation e-mail shows (US-56 = same data as US-25). */
export type ApplicationConfirmation = {
  email: string
  /** Application.locale — language of the e-mail. */
  locale: Locale
  firstName: string
  eventName: string
  /** Variable symbol. */
  applicationNumber: number
  accessToken: string
  bankAccount: string
  amountDueCzk: number
  terms: { name: string; status: ApplicationTermStatus }[]
}
