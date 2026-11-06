import type { ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Bell } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import type { NotificationFeed } from "@/components/organisms/NotificationPanel"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDate } from "@/lib/date"

import {
  markNotificationRead,
  participantNotificationsQueryOptions,
} from "@/features/participant/api/notifications"

// Figma (Design system): US-114 Detail přihlášky · Žádost čeká / Změna schválená / Žádost zamítnutá, notification trigger · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15928-9331
export function ChangeRequestNotifications({
  children,
}: {
  children?: (feed: NotificationFeed) => ReactNode
}) {
  const { t } = useTranslation("participant")
  const query = useQuery(participantNotificationsQueryOptions())
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ["participant", "change-request-notifications"] }),
  })
  const unread = query.data?.filter((item) => !item.readAt).length ?? 0
  if (children) {
    return children({
      items: (query.data ?? []).map((item) => ({
        id: item.id,
        applicationId: item.applicationId,
        createdAt: item.reviewedAt ?? item.createdAt,
        isUnread: !item.readAt,
        title: t(`notifications.status.${item.status}`),
        participant: item.eventName,
        context: "",
        time: formatDate(item.reviewedAt ?? item.createdAt),
      })),
      unreadCount: unread,
      state: query.isPending ? "loading" : query.isError ? "error" : "ready",
      onRetry: () => void query.refetch(),
      onMarkRead: (id) => mutation.mutate(id),
      onMarkAllRead: () => {
        for (const item of query.data ?? []) {
          if (!item.readAt) mutation.mutate(item.id)
        }
      },
    })
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={t("notifications.label", { count: unread })}
        >
          <Bell
            className="size-5"
            aria-hidden="true"
          />
          {unread > 0 ? (
            <span className="rounded-full bg-accent px-1.5 text-xs text-accent-foreground">
              {unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-96 w-[calc(100vw-2rem)] max-w-80 overflow-y-auto"
      >
        <h2 className="mb-3 font-semibold">{t("notifications.title")}</h2>
        {query.isPending ? (
          <p>{t("notifications.loading")}</p>
        ) : query.isError ? (
          <div className="flex flex-col gap-2">
            <p>{t("notifications.error")}</p>
            <Button
              variant="outline"
              onClick={() => void query.refetch()}
            >
              {t("notifications.retry")}
            </Button>
          </div>
        ) : query.data.length === 0 ? (
          <p>{t("notifications.empty")}</p>
        ) : (
          <ul className="flex flex-col">
            {query.data.map((item) => (
              <li
                key={item.id}
                className="border-t py-3"
              >
                <Link
                  to={ROUTES.participant.application}
                  params={{ applicationId: item.applicationId }}
                  className="block rounded-md p-2 hover:bg-accent focus-visible:outline focus-visible:outline-ring"
                  onClick={() => {
                    if (!item.readAt) mutation.mutate(item.id)
                  }}
                >
                  <span className="block font-medium">{item.eventName}</span>
                  <span className="block text-sm">{t(`notifications.status.${item.status}`)}</span>
                  <span className="block text-sm text-muted-foreground">
                    {formatDate(item.reviewedAt ?? item.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
