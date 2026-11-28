import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { NotificationBell } from "@/components/molecules/NotificationBell"
import { NotificationPanel, type NotificationFeed } from "@/components/organisms/NotificationPanel"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { currentLanguage } from "@/i18n"

import {
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from "@/features/notifications/hooks/use-notifications"
import { composeNotification } from "@/features/notifications/lib/compose"

/**
 * The bell with the number of unread notifications and the panel it opens (US-118).
 * The count is fetched when the page loads, the list when the panel opens; marking as read
 * refetches both.
 */
// Figma (Design system): US-118 / Moje přihlášky · Panel: Upozornění · 3 nepřečtená upozornění / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16047-1567
// Figma (Design system): US-118 / Moje přihlášky · Panel: Upozornění · 3 nepřečtená upozornění / Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16047-1650
export function NotificationCenter({
  additionalFeed,
  area = "participant",
}: {
  additionalFeed?: NotificationFeed
  area?: "participant" | "organizer"
}) {
  const { t } = useTranslation("notifications")
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const unread = useUnreadCount()
  const list = useNotifications({ isEnabled: isOpen })
  const { markRead, markAllRead } = useMarkRead()
  const language = currentLanguage()

  const notifications = list.data ?? []
  const rows = notifications.map((notification) => ({
    id: notification.id,
    createdAt: notification.createdAt,
    isUnread: notification.readAt === null,
    ...composeNotification(notification, t, language),
  }))
  const additionalPrefix = "change-request:"
  const items = [
    ...rows,
    ...(additionalFeed?.items ?? []).map((item) => ({
      ...item,
      id: `${additionalPrefix}${item.id}`,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const markOneRead = (id: string) => {
    if (id.startsWith(additionalPrefix)) {
      additionalFeed?.onMarkRead(id.slice(additionalPrefix.length))
    } else {
      markRead.mutate(id)
    }
  }

  const open = (id: string) => {
    if (id.startsWith(additionalPrefix)) {
      const item = additionalFeed?.items.find(
        (candidate) => candidate.id === id.slice(additionalPrefix.length),
      )
      if (!item) return
      if (item.isUnread) markOneRead(id)
      setIsOpen(false)
      void navigate({
        to: ROUTES.participant.application,
        params: { applicationId: item.applicationId },
      })
      return
    }
    const notification = notifications.find((candidate) => candidate.id === id)
    if (!notification) return
    if (notification.readAt === null) markRead.mutate(id)
    setIsOpen(false)
    if (notification.kind === "BOARD_POST_PUBLISHED" && notification.params.postId) {
      void navigate({
        to: ROUTES.participant.boardPost,
        params: { postId: notification.params.postId },
      })
      return
    }
    if (notification.applicationId) {
      if (area === "organizer") {
        // An older notification may not carry the event: the events list is the fallback.
        if (!notification.params.eventId) {
          void navigate({ to: ROUTES.organizer.events })
          return
        }
        void navigate({
          to: ROUTES.organizer.application,
          params: {
            eventId: notification.params.eventId,
            applicationId: notification.applicationId,
          },
        })
        return
      }
      void navigate({
        to: ROUTES.participant.application,
        params: { applicationId: notification.applicationId },
      })
    }
  }

  return (
    <>
      <NotificationBell
        unreadCount={(unread.data ?? 0) + (additionalFeed?.unreadCount ?? 0)}
        onClick={() => setIsOpen(true)}
      />
      <Dialog
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <DialogContent
          showCloseButton={false}
          // Figma F4 and F5: a card by the bell — under the 56 px header on a phone, next to the sidebar on a desktop.
          className="top-16 flex max-h-[calc(100svh-5rem)] translate-y-0 flex-col content-start gap-0 overflow-hidden rounded-xl p-0 sm:max-w-110 lg:top-4 lg:left-62 lg:max-h-[calc(100svh-2rem)] lg:translate-x-0"
        >
          <div className="flex shrink-0 items-center gap-4 pt-4 pr-3 pb-1 pl-4 md:pt-6 md:pr-4 md:pl-6">
            <DialogTitle className="flex-1 text-2xl font-bold">{t("panel.title")}</DialogTitle>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                aria-label={t("panel.close")}
                title={t("panel.close")}
              >
                <X
                  className="size-5"
                  aria-hidden="true"
                />
              </Button>
            </DialogClose>
          </div>
          <DialogDescription className="sr-only">{t("panel.title")}</DialogDescription>
          {/* Only the list scrolls, with its scrollbar at the edge of the panel; the padding is inside it. */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <NotificationPanel
              state={
                list.isPending || additionalFeed?.state === "loading"
                  ? "loading"
                  : list.isError || additionalFeed?.state === "error"
                    ? "error"
                    : "ready"
              }
              items={items}
              hasUnread={items.some((row) => row.isUnread)}
              onRetry={() => {
                void list.refetch()
                additionalFeed?.onRetry()
              }}
              onOpen={open}
              onMarkAllRead={() => {
                markAllRead.mutate()
                additionalFeed?.onMarkAllRead()
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
