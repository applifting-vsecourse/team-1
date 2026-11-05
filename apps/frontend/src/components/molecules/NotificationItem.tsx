import { ChevronRight, MailCheck } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type NotificationItemProps = {
  title: string
  detail: string
  /** Already formatted, `11. 3. 2027 · 10:32`. */
  time: string
  isUnread: boolean
  /** Opens the application the notification is about. */
  onOpen: () => void
  /** Only for an unread notification. */
  onMarkRead: () => void
}

/** One notification: unread and read differ in the badge text and the background (Figma). */
// Figma (Design system): Togena / Notification item · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16047-1617
export function NotificationItem({
  title,
  detail,
  time,
  isUnread,
  onOpen,
  onMarkRead,
}: NotificationItemProps) {
  const { t } = useTranslation("notifications")

  return (
    <article
      data-unread={isUnread}
      className={cn("flex flex-col gap-2 rounded-lg p-4", isUnread && "bg-secondary")}
    >
      <div className="flex items-center justify-between">
        <Badge variant={isUnread ? "default" : "secondary"}>
          {isUnread ? t("item.new") : t("item.read")}
        </Badge>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={t("item.open")}
            title={t("item.open")}
            onClick={onOpen}
          >
            <ChevronRight
              className="size-5"
              aria-hidden="true"
            />
          </Button>
          {isUnread ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label={t("item.markRead")}
              title={t("item.markRead")}
              onClick={onMarkRead}
            >
              <MailCheck
                className="size-5"
                aria-hidden="true"
              />
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-base">{title}</p>
      <p className="text-base">{detail}</p>
      <p className="text-sm">{time}</p>
    </article>
  )
}
