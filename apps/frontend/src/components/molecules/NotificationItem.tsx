import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

export type NotificationItemProps = {
  /** What happened. */
  title: string
  /** Whose application. */
  participant: string
  /** The term and the event. */
  context: string
  /** An extra line, e.g. what is still owed after a payment. */
  note?: string
  /** Already formatted, `11. 3. 2027 · 10:32`. */
  time: string
  /** What opening says to a screen reader; the application by default. */
  openLabel?: string
  isUnread: boolean
  /** Opens the application the notification is about, which also marks it as read. */
  onOpen: () => void
}

/**
 * One notification, a row of the panel: an orange dot while it is unread (system B: this is new
 * for you), the title — Semi Bold while unread, muted once read — with the time, then whose
 * application and where, and an optional note. The whole row opens the application.
 */
// Figma (Design system v2): Togena / Feedback / Notification item · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27660-34073 (read: 27660-34100)
export function NotificationItem({
  title,
  participant,
  context,
  note,
  time,
  openLabel,
  isUnread,
  onOpen,
}: NotificationItemProps) {
  const { t } = useTranslation("notifications")

  return (
    <button
      type="button"
      data-unread={isUnread}
      onClick={onOpen}
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-action-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring md:px-6"
    >
      <span
        aria-hidden="true"
        className="flex h-6 w-2 shrink-0 items-center"
      >
        {isUnread ? (
          <span className="size-2 rounded-full border border-border-strong bg-brand-warm" />
        ) : null}
      </span>
      <span className="grid min-w-0 flex-1 gap-x-3 gap-y-0.5 md:grid-cols-[minmax(0,1fr)_auto]">
        <span className={cn("wrap-anywhere", isUnread ? "font-semibold" : "text-muted-foreground")}>
          {title}
        </span>
        <span className="order-last text-sm text-muted-foreground md:order-none md:whitespace-nowrap">
          {time}
        </span>
        <span className="text-sm wrap-anywhere text-muted-foreground md:col-span-2">
          {[participant, context].filter(Boolean).join(" · ")}
        </span>
        {note ? <span className="text-sm md:col-span-2">{note}</span> : null}
        <span className="sr-only">
          {isUnread ? t("item.new") : t("item.read")}, {openLabel ?? t("item.open")}
        </span>
      </span>
    </button>
  )
}
