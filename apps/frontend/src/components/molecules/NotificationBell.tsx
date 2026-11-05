import { Bell } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

type NotificationBellProps = {
  /** Unread notifications; the badge is hidden at 0. */
  unreadCount: number
  onClick?: () => void
}

/**
 * The header entry to the notifications: a bell and the number of unread ones. Shared by the
 * areas; the organizer's bell (US-86) reuses it.
 */
// Figma (Design system): US-118 / Moje přihlášky · Panel: Upozornění · 3 nepřečtená upozornění / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16047-1567
export function NotificationBell({ unreadCount, onClick }: NotificationBellProps) {
  const { t } = useTranslation("notifications")
  const label = unreadCount > 0 ? t("bell.labelUnread", { count: unreadCount }) : t("bell.label")

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        aria-label={label}
        title={label}
        onClick={onClick}
      >
        <Bell
          className="size-5"
          aria-hidden="true"
        />
      </Button>
      {unreadCount > 0 ? (
        <span
          aria-hidden="true"
          className="flex min-h-6 w-6 items-center justify-center rounded-full bg-accent text-sm text-accent-foreground"
        >
          {unreadCount}
        </span>
      ) : null}
    </div>
  )
}
