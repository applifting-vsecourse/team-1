import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import { ApplicationChangeKind } from "@/modules/participants/domain/submission-confirmation"

/** What the notification is about; the organizer's bell (US-86) reuses the same types. */
export type NotificationType = "STATUS_CHANGED" | "PAYMENT" | "REQUEST"

/**
 * The event within the type. The copy is composed from it and `params` by the frontend in the
 * reader's language (`features/notifications/lib/compose.ts`), so a kind is added there too.
 */
export type NotificationKind =
  /** The kinds of `changeEmailKind`: the same transitions as the e-mail about a change (EMAILY.md). */
  | Extract<
      ApplicationChangeKind,
      | "CONFIRMED"
      | "CONFIRMED_FROM_WAITLIST"
      | "WAITLISTED"
      | "WAITLISTED_AFTER_CONFIRMED"
      | "REJECTED"
      | "NO_BED_FREED"
      | "CANCELLED_BY_ORGANIZER"
      | "CANCELLED"
    >
  | "PAYMENT_RECORDED"
  | "PAYMENT_CANCELLED"
  | "PAYMENT_REFUNDED"
  /** Prepared for US-114 (requests for a change); nothing raises it yet. */
  | "REQUEST_APPROVED"
  | "APPLICATION_EDITED"

/** The data the copy is composed from. Dates are ISO days, amounts whole CZK. */
export type NotificationParams = {
  eventName: string
  participantName: string
  termStartsOn?: string
  termEndsOn?: string
  /** STATUS_CHANGED: the status of the application in the term before and after the change. */
  fromStatus?: ApplicationTermStatus
  toStatus?: ApplicationTermStatus
  /** PAYMENT: the amount of the receipt in this term; a refund is positive, the kind says so. */
  amountCzk?: number
  /** PAYMENT: what is still owed in the term after the change. */
  owedCzk?: number
}

export type Notification = {
  id: string
  type: NotificationType
  kind: NotificationKind
  applicationId: string | null
  params: NotificationParams
  createdAt: Date
  /** Null = unread. */
  readAt: Date | null
}

/** What a change hands over to be written, in the transaction of the change. */
export type NewNotification = {
  userId: string
  type: NotificationType
  kind: NotificationKind
  applicationId: string | null
  params: NotificationParams
}

export const typeOfKind = (kind: NotificationKind): NotificationType =>
  kind.startsWith("PAYMENT_")
    ? "PAYMENT"
    : kind.startsWith("REQUEST_") || kind === "APPLICATION_EDITED"
      ? "REQUEST"
      : "STATUS_CHANGED"

/** The day of a `@db.Date` column as `2027-07-12`. */
export const isoDay = (date: Date): string => date.toISOString().slice(0, 10)

/**
 * A notification for the account the application belongs to. An application without an account
 * (`userId` null) has nobody to tell, so none is made.
 */
export function buildNotification(input: {
  userId: string | null
  applicationId: string
  kind: NotificationKind
  params: NotificationParams
}): NewNotification | null {
  if (!input.userId) return null
  return {
    userId: input.userId,
    type: typeOfKind(input.kind),
    kind: input.kind,
    applicationId: input.applicationId,
    params: input.params,
  }
}
