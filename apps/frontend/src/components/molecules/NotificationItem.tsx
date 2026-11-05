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
  isUnread: boolean
  /** Opens the application the notification is about. */
  onOpen: () => void
  /** Only for an unread notification. */
  onMarkRead: () => void
}

/**
 * One notification. The whole item opens the application (the button stretches over it); the
 * envelope, which marks it as read, sits above it as the one separate action. Unread ones carry a coloured "New" chip and a tinted background, read ones a quiet chip.
 */
// Figma (Design system): Togena / Notification item · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16047-1617
export function NotificationItem({
  title,
  participant,
  context,
  change,
  note,
  time,
  isUnread,
  onOpen,
  onMarkRead,
}: NotificationItemProps) {
  const { t } = useTranslation("notifications")

  return (
    <article
      data-unread={isUnread}
      className={cn(
        "relative flex items-start gap-1 rounded-lg border border-border transition-colors hover:bg-accent/40",
        isUnread ? "border-transparent bg-secondary" : "bg-card",
      )}
    >
      <button
        type="button"
        aria-label={`${title}, ${participant}, ${t("item.open")}`}
        onClick={onOpen}
        className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg p-4 text-left outline-none after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
      >
        <span className="flex items-center gap-2">
          <Badge
            variant={isUnread ? "default" : "secondary"}
            className="px-2 py-1 text-sm"
          >
            {isUnread ? t("item.new") : t("item.read")}
          </Badge>
          <span className="text-sm text-muted-foreground">{time}</span>
          <ChevronRight
            className="ml-auto size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </span>
        <span className="text-base font-medium">{title}</span>
        <span className="flex flex-col gap-0.5">
          <span className="text-base">{participant}</span>
          <span className="text-sm text-muted-foreground">{context}</span>
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
      </button>
      {isUnread ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="relative z-10 mt-2 mr-2 shrink-0"
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
    </article>
  )
}
