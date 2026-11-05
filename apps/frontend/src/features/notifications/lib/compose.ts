import type { TFunction } from "i18next"

import type { Language } from "@/i18n"
import { formatDate, formatDateRange, formatTime } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import type { AppNotification } from "@/features/notifications/api/notifications"

export type NotificationText = {
  /** What happened, in one line. */
  title: string
  /** Whose application. */
  participant: string
  /** Where: `12.–18. 7. 2027 · Letní kemp Lipno 2027`. */
  context: string
  /** STATUS_CHANGED: the status before and after, as labels. */
  change?: { from: string; to: string }
  /** PAYMENT: what is still owed in the term, `Zbývá zaplatit: 4 400 Kč`. */
  note?: string
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
  const amount = formatCzk(Math.abs(params.amountCzk ?? 0), language)
  const range = formatDateRange(params.termStartsOn, params.termEndsOn, {
    shouldShowYear: true,
    language,
  })
  const text: NotificationText = {
    title: t(`title.${kind}`, { amount }),
    participant: params.participantName,
    context: `${range} · ${params.eventName}`,
    time: `${formatDate(createdAt, language)} · ${formatTime(createdAt, language)}`,
  }

  if (params.fromStatus && params.toStatus) {
    text.change = {
      from: t(`status.${params.fromStatus}`),
      to: t(`status.${params.toStatus}`),
    }
  }
  if (kind.startsWith("PAYMENT_") && params.owedCzk !== undefined) {
    text.note = t("note.owed", { owed: formatCzk(params.owedCzk, language) })
  }
  return text
}
