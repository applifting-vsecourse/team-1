import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { NotificationBell } from "@/components/molecules/NotificationBell"
import { NotificationPanel } from "@/components/organisms/NotificationPanel"
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
 * The participant's bell with the number of unread notifications and the panel it opens (US-118).
 * The count is fetched when the page loads, the list when the panel opens; marking as read
 * refetches both.
 */
// Figma (Design system): US-118 / Moje přihlášky · Panel: Upozornění · 3 nepřečtená upozornění / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16047-1567
// Figma (Design system): US-118 / Moje přihlášky · Panel: Upozornění · 3 nepřečtená upozornění / Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16047-1650
export function NotificationCenter() {
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
    isUnread: notification.readAt === null,
    ...composeNotification(notification, t, language),
  }))

  const open = (id: string) => {
    const notification = notifications.find((candidate) => candidate.id === id)
    if (!notification) return
    if (notification.readAt === null) markRead.mutate(id)
    setIsOpen(false)
    if (notification.applicationId) {
      void navigate({
        to: ROUTES.participant.application,
        params: { applicationId: notification.applicationId },
      })
    }
  }

  return (
    <>
      <NotificationBell
        unreadCount={unread.data ?? 0}
        onClick={() => setIsOpen(true)}
      />
      <Dialog
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <DialogContent
          showCloseButton={false}
          className="max-h-[calc(100svh-2rem)] content-start gap-5 overflow-y-auto rounded-2xl p-4 sm:max-w-110 md:top-16 md:right-6 md:left-auto md:translate-x-0 md:translate-y-0 md:p-6"
        >
          <div className="flex items-center gap-4">
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
          <NotificationPanel
            state={list.isPending ? "loading" : list.isError ? "error" : "ready"}
            items={rows}
            hasUnread={rows.some((row) => row.isUnread)}
            onRetry={() => void list.refetch()}
            onOpen={open}
            onMarkRead={(id) => markRead.mutate(id)}
            onMarkAllRead={() => markAllRead.mutate()}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
