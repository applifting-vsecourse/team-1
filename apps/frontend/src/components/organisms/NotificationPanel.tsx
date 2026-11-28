import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ListSkeleton } from "@/components/molecules/ListSkeleton"
import { LoadingState } from "@/components/molecules/LoadingState"
import {
  NotificationItem,
  type NotificationItemProps,
} from "@/components/molecules/NotificationItem"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export type NotificationRow = Omit<NotificationItemProps, "onOpen"> & {
  id: string
}

/** An independent notification source, composed by the area route. */
export type NotificationFeed = {
  items: (NotificationRow & { applicationId: string; createdAt: string })[]
  unreadCount: number
  state: "loading" | "error" | "ready"
  onRetry: () => void
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}

type NotificationPanelProps = {
  state: "loading" | "error" | "ready"
  /** Newest first. */
  items: NotificationRow[]
  hasUnread: boolean
  onRetry: () => void
  onOpen: (id: string) => void
  onMarkAllRead: () => void
}

/**
 * The content of the notification panel in every state the design draws. The list is rows divided by
 * hairlines, edge to edge; „Označit vše jako přečtené“ is a quiet button above it, and opening a
 * notification marks it as read (there is no separate action per row).
 */
// Figma (Design system v2): Překryv · panel Upozornění · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27651-34927 (360 px: 22342-22939)
// Figma (Design system): US-118 / Moje přihlášky · Panel: Upozornění · 3 nepřečtená upozornění / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16047-1567
// Figma (Design system): US-118 / … · Chyba upozornění / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16047-2135
// Figma (Design system): US-118 / … · Žádná upozornění / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16047-1949
// Figma (Design system): US-118 / … · Načítání upozornění / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16047-2032
export function NotificationPanel({
  state,
  items,
  hasUnread,
  onRetry,
  onOpen,
  onMarkAllRead,
}: NotificationPanelProps) {
  const { t } = useTranslation("notifications")

  if (state === "loading") {
    return (
      <div className="px-4 pb-4 md:px-6 md:pb-6">
        <div className="md:hidden">
          <ListSkeleton />
        </div>
        <div className="hidden md:block">
          <LoadingState label={t("panel.loading")} />
        </div>
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="flex flex-col gap-4 px-4 pb-4 md:px-6 md:pb-6">
        <Alert
          variant="destructive"
          className="border-destructive bg-card [&>svg]:size-6"
        >
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>{t("panel.errorTitle")}</AlertTitle>
          <AlertDescription>{t("panel.errorDescription")}</AlertDescription>
        </Alert>
        <Button
          type="button"
          size="lg"
          onClick={onRetry}
        >
          {t("panel.retry")}
        </Button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="px-4 pb-4 md:px-6 md:pb-6">
        <Alert className="bg-secondary [&>svg]:size-6">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>{t("panel.emptyTitle")}</AlertTitle>
          <AlertDescription>{t("panel.emptyDescription")}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-2">
      {hasUnread ? (
        <div className="px-4 pb-2 md:px-6">
          <Button
            type="button"
            variant="ghost"
            className="-ml-4"
            onClick={onMarkAllRead}
          >
            {t("panel.markAllRead")}
          </Button>
        </div>
      ) : null}
      <ul className="flex flex-col divide-y divide-border">
        {items.map(({ id, ...item }) => (
          <li key={id}>
            <NotificationItem
              {...item}
              onOpen={() => onOpen(id)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
