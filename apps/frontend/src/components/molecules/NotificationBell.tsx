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
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      className={unreadCount > 0 ? "w-auto gap-1.5 px-2.5" : undefined}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Bell
        className="size-5"
        aria-hidden="true"
      />
      {unreadCount > 0 ? (
        <span
          aria-hidden="true"
          className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground"
        >
          {unreadCount}
        </span>
      ) : null}
    </Button>
  )
}
