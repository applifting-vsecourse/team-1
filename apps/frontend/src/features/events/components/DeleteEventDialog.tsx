import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { CircleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { PendingButton } from "@/components/atoms/PendingButton"
import { ErrorState } from "@/components/molecules/ErrorState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiErrorCode } from "@/lib/api-client"
import { notify } from "@/lib/notify"

import { deleteEvent, eventKeys, type OrganizerEvent } from "@/features/events/api/events"

/**
 * Confirms deleting an event with its terms and rooms. The API refuses an event with
 * applications (issue #153, code EVENT_HAS_APPLICATIONS); the same dialog then turns into
 * "Akci nelze smazat" and the event settings behind it refresh to the blocked state.
 */
// Figma (Design system): #404 Dialog · potvrzení smazání · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=22642-93349 (mobil 22642-93462)
// Figma (Design system): #404 Dialog · akci nelze smazat · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=22642-93522 (mobil 22642-93635)
export function DeleteEventDialog({
  event,
  onClose,
}: {
  event: OrganizerEvent
  onClose: () => void
}) {
  const { t } = useTranslation("events")
  const client = useQueryClient()
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationFn: () => deleteEvent(event.id),
    onSuccess: async () => {
      client.removeQueries({ queryKey: eventKeys.detail(event.id) })
      await client.invalidateQueries({ queryKey: eventKeys.all() })
      notify.success(t("delete.deleted", { name: event.name }))
      await navigate({ to: ROUTES.organizer.events })
    },
    onError: async (error) => {
      // An application arrived after the settings were loaded: bring the screen behind up to date.
      if (apiErrorCode(error) === "EVENT_HAS_APPLICATIONS") {
        await client.invalidateQueries({ queryKey: eventKeys.detail(event.id) })
      }
    },
  })
  const isBlocked = mutation.isError && apiErrorCode(mutation.error) === "EVENT_HAS_APPLICATIONS"

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className="gap-3 rounded-md p-4 sm:max-w-160 sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="pr-8 text-2xl leading-8 tracking-tight">
            {isBlocked ? t("delete.blockedTitle") : t("delete.title")}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-base text-foreground">{event.name}</DialogDescription>
        {isBlocked ? (
          <Alert
            variant="destructive"
            className="border-destructive bg-card *:data-[slot=alert-description]:text-muted-foreground"
          >
            <CircleAlert />
            <AlertTitle className="line-clamp-none">{t("delete.blockedAlertTitle")}</AlertTitle>
            <AlertDescription>{t("delete.blockedAlertDescription")}</AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert
              variant="destructive"
              className="border-destructive bg-card *:data-[slot=alert-description]:text-muted-foreground"
            >
              <CircleAlert />
              <AlertTitle className="line-clamp-none">{t("delete.alertTitle")}</AlertTitle>
              <AlertDescription>{t("delete.alertDescription")}</AlertDescription>
            </Alert>
            {mutation.isError ? (
              <ErrorState
                title={t("delete.failed")}
                error={mutation.error}
              />
            ) : null}
          </>
        )}
        {isBlocked ? (
          <DialogFooter showCloseButton />
        ) : (
          <DialogFooter className="flex-row justify-end gap-2">
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="lg"
                disabled={mutation.isPending}
              >
                {t("delete.cancel")}
              </Button>
            </DialogClose>
            <PendingButton
              isPending={mutation.isPending}
              variant="destructive"
              size="lg"
              className="flex-1 sm:flex-none"
              onClick={() => mutation.mutate()}
            >
              {t("delete.confirm")}
            </PendingButton>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
