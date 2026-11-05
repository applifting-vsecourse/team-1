import type { TFunction } from "i18next"

import type { Language } from "@/i18n"
import { formatDate, formatDateRange, formatTime } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import type { AppNotification } from "@/features/notifications/api/notifications"

export type NotificationText = {
  title: string
  /** The second line: who, which term, what changed. */
  detail: string
  /** `11. 3. 2027 · 10:32` */
  time: string
}

/**
 * The copy of a notification, composed from its kind and data in the reader's language
 * (US-118). Nothing is stored as text, so the notification follows the language switcher.
 */
export function composeNotification(
  notification: AppNotification,
  t: TFunction<"notifications">,
  language: Language,
): NotificationText {
  const { kind, params, createdAt } = notification
  const { participantName: participant, eventName: event } = params
  const range = (shouldShowYear: boolean) =>
    formatDateRange(params.termStartsOn, params.termEndsOn, { shouldShowYear, language })
  const amount = formatCzk(Math.abs(params.amountCzk ?? 0), language)
  const owed = formatCzk(params.owedCzk ?? 0, language)

  const time = `${formatDate(createdAt, language)} · ${formatTime(createdAt, language)}`
  const title = t(`title.${kind}`, { amount })

  switch (kind) {
    case "PAYMENT_RECORDED":
      return {
        title,
        detail: t("detail.paymentRecorded", { participant, term: range(false), owed }),
        time,
      }
    case "PAYMENT_CANCELLED":
      return {
        title,
        detail: t("detail.paymentCancelled", { participant, term: range(false), owed }),
        time,
      }
    case "PAYMENT_REFUNDED":
      return {
        title,
        detail: t("detail.paymentRefunded", { participant, term: range(false) }),
        time,
      }
    case "REQUEST_APPROVED":
      return {
        title,
        detail: t("detail.requestApproved", { participant, term: range(true) }),
        time,
      }
    default:
      return {
        title,
        detail: t("detail.statusChanged", { participant, term: range(true), event }),
        time,
      }
  }
}
