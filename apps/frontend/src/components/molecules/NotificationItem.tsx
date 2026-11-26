import { ArrowRight, ChevronRight, MailCheck } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type NotificationItemProps = {
  /** What happened. */
  title: string
  /** Whose application. */
  participant: string
  /** The term and the event. */
  context: string
  /** A status change: the status before and after. */
  change?: { from: string; to: string }
  /** An extra line, e.g. what is still owed after a payment. */
  note?: string
  /** Already formatted, `11. 3. 2027 · 10:32`. */
  time: string
  /** What opening says to a screen reader; the application by default. */
  openLabel?: string
  isUnread: boolean
  /** Opens the application the notification is about. */
  onOpen: () => void
  /** Only for an unread notification. */
  onMarkRead: () => void
}

/**
 * One notification. The whole item opens the application (the button stretches over it); the
 * envelope, which marks it as read, sits above it as the one separate action. Unread notifications use the status wash and expose a separate mark-as-read action.
 */
// Figma (Design system): Togena / Notification item · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16047-1617
export function NotificationItem({
  title,
  participant,
  context,
  change,
  note,
  time,
  openLabel,
  isUnread,
  onOpen,
  onMarkRead,
}: NotificationItemProps) {
  const { t } = useTranslation("notifications")

  return (
    <article
      data-unread={isUnread}
      className={cn(
        "relative flex flex-col gap-2 rounded-lg p-4 transition-colors hover:bg-accent/40",
        isUnread ? "bg-wash" : "bg-card",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Badge variant="neutral">{isUnread ? t("item.new") : t("item.read")}</Badge>
        <div className="flex gap-2">
          {isUnread ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="relative z-10"
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
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="static after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
            aria-label={`${title}, ${participant}, ${openLabel ?? t("item.open")}`}
            onClick={onOpen}
          >
            <ChevronRight
              className="size-5"
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>
      <span className="text-base">{title}</span>
      <span className="text-base">
        <span>{participant}</span>
        {context && (
          <>
            {" "}
            · <span>{context}</span>
          </>
        )}
      </span>
      {change ? (
        <span className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("change.label")}</span>
          <Badge
            variant="secondary"
            className="px-2 py-0.5 text-sm"
          >
            {change.from}
          </Badge>
          <ArrowRight
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Badge
            variant="default"
            className="px-2 py-0.5 text-sm"
          >
            {change.to}
          </Badge>
        </span>
      ) : null}
      {note ? <span className="text-sm">{note}</span> : null}
      <span className="text-sm">{time}</span>
    </article>
  )
}
