import { MailCheck, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  NotificationItem,
  type NotificationItemProps,
} from "@/components/molecules/NotificationItem"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export type NotificationRow = Omit<NotificationItemProps, "onOpen" | "onMarkRead"> & {
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
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}

/** The content of the notification panel in every state the design draws. */
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
  onMarkRead,
  onMarkAllRead,
}: NotificationPanelProps) {
  const { t } = useTranslation("notifications")

  if (state === "loading") {
    return (
      <div
        role="status"
        className="flex flex-col gap-3 rounded-lg border border-border p-4"
      >
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            aria-hidden="true"
            className="flex items-center gap-3"
          >
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 rounded-full" />
              <Skeleton className="h-2.5 rounded-full" />
            </div>
          </div>
        ))}
        <p className="text-sm text-muted-foreground">{t("panel.loading")}</p>
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="flex flex-col gap-4">
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
      <Alert className="bg-secondary [&>svg]:size-6">
        <TriangleAlert aria-hidden="true" />
        <AlertTitle>{t("panel.emptyTitle")}</AlertTitle>
        <AlertDescription>{t("panel.emptyDescription")}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {hasUnread ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full border-primary font-semibold text-primary hover:bg-accent"
          onClick={onMarkAllRead}
        >
          <MailCheck aria-hidden="true" />
          {t("panel.markAllRead")}
        </Button>
      ) : null}
      <ul className="flex flex-col gap-3">
        {items.map(({ id, ...item }) => (
          <li key={id}>
            <NotificationItem
              {...item}
              onOpen={() => onOpen(id)}
              onMarkRead={() => onMarkRead(id)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
