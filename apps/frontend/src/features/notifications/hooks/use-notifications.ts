import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  markAllNotificationsRead,
  markNotificationRead,
  notificationKeys,
  notificationsQueryOptions,
  unreadCountQueryOptions,
} from "@/features/notifications/api/notifications"

/** The number in the header; read when the page loads and after the user's own actions, no polling. */
export function useUnreadCount() {
  return useQuery(unreadCountQueryOptions())
}

export function useNotifications(options: { isEnabled: boolean }) {
  return useQuery({ ...notificationsQueryOptions(), enabled: options.isEnabled })
}

/** Marking read changes both the list and the count, so both are refetched. */
export function useMarkRead() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: notificationKeys.all })
  return {
    markRead: useMutation({ mutationFn: markNotificationRead, onSuccess: invalidate }),
    markAllRead: useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidate }),
  }
}
