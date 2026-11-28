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
  /** PAYMENT: what is still owed in the term, `Zbývá zaplatit: 4 400 Kč`. */
  note?: string
  /** `11. 3. 2027 · 10:32` */
  time: string
  /** What opening it says to a screen reader, when it is not the application. */
  openLabel?: string
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
  const range =
    params.termStartsOn && params.termEndsOn
      ? formatDateRange(params.termStartsOn, params.termEndsOn, {
          shouldShowYear: true,
          language,
        })
      : null
  const text: NotificationText = {
    title: t(`title.${kind}`, { amount }),
    participant: params.participantName,
    context: range ? `${range} · ${params.eventName}` : params.eventName,
    time: `${formatDate(createdAt, language)} · ${formatTime(createdAt, language)}`,
  }

  if (kind === "BOARD_POST_PUBLISHED") {
    // A post has no participant: its title takes that place of the line, then the event.
    text.participant = params.postTitle ?? ""
    text.openLabel = t("item.openPost")
  }
  if (kind.startsWith("PAYMENT_") && params.owedCzk !== undefined) {
    text.note = t("note.owed", { owed: formatCzk(params.owedCzk, language) })
  }
  return text
}
