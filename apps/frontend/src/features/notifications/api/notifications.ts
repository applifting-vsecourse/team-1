import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

/** What happened; the copy is composed from `kind` and `params` at display time, never stored. */
export const NOTIFICATION_KINDS = [
  // STATUS_CHANGED — the rows of docs/procesy/zpracovani-prihlasky/EMAILY.md
  "CONFIRMED",
  "CONFIRMED_FROM_WAITLIST",
  "WAITLISTED",
  "WAITLISTED_AFTER_CONFIRMED",
  "REJECTED",
  "NO_BED_FREED",
  "CANCELLED_BY_ORGANIZER",
  "CANCELLED",
  // PAYMENT
  "PAYMENT_RECORDED",
  "PAYMENT_CANCELLED",
  "PAYMENT_REFUNDED",
  // REQUEST — prepared for US-114, nothing raises it yet
  "REQUEST_APPROVED",
  "APPLICATION_EDITED",
] as const
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]

const termStatusSchema = z.enum(["TO_EVALUATE", "CONFIRMED", "WAITLISTED", "CANCELLED", "ARCHIVED"])

const notificationSchema = z.object({
  id: z.string(),
  type: z.enum(["STATUS_CHANGED", "PAYMENT", "REQUEST"]),
  kind: z.enum(NOTIFICATION_KINDS),
  /** The application the notification leads to. */
  applicationId: z.string().nullable(),
  params: z.object({
    eventId: z.string().optional(),
    eventName: z.string(),
    participantName: z.string(),
    /** ISO dates of the term the notification is about. */
    termStartsOn: z.string().optional(),
    termEndsOn: z.string().optional(),
    /** STATUS_CHANGED: the status in the term before and after the change. */
    fromStatus: termStatusSchema.optional(),
    toStatus: termStatusSchema.optional(),
    /** PAYMENT: the amount of the payment, whole CZK; a refund is negative. */
    amountCzk: z.number().int().optional(),
    /** PAYMENT: what is still owed in the term after the payment. */
    owedCzk: z.number().int().optional(),
  }),
  /** ISO instant. */
  createdAt: z.string(),
  /** `null` = unread. */
  readAt: z.string().nullable(),
})
export type AppNotification = z.infer<typeof notificationSchema>

const unreadCountSchema = z.object({ count: z.number().int().nonnegative() })

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
}

/** `GET /api/notifications` — the signed-in user's notifications, newest first (US-118). */
export const notificationsQueryOptions = () =>
  queryOptions({
    queryKey: notificationKeys.list(),
    queryFn: async (): Promise<AppNotification[]> =>
      z.array(notificationSchema).parse(await api.get("notifications").json()),
  })

/** `GET /api/notifications/unread-count` — the number in the header. */
export const unreadCountQueryOptions = () =>
  queryOptions({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async (): Promise<number> =>
      unreadCountSchema.parse(await api.get("notifications/unread-count").json()).count,
  })

/** `POST /api/notifications/:id/read` */
export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`notifications/${encodeURIComponent(id)}/read`)
}

/** `POST /api/notifications/read-all` */
export async function markAllNotificationsRead(): Promise<void> {
  await api.post("notifications/read-all")
}
