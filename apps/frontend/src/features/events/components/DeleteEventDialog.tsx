import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { ErrorState } from "@/components/molecules/ErrorState"
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
import { notify } from "@/lib/notify"

import { deleteEvent, eventKeys, type OrganizerEvent } from "@/features/events/api/events"

/**
 * Confirms deleting an event with its terms and rooms. The API refuses an event with
 * applications (issue #153); the dialog then shows that error and keeps the event.
 * No Figma frame yet — follows the term cancel and room deletion dialogs (X21).
 */
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
  })
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className="gap-4 p-6 sm:max-w-170">
        <DialogHeader>
          <p className="text-xs font-medium text-muted-foreground uppercase">{event.name}</p>
          <DialogTitle className="pr-8 text-lg tracking-tight">{t("delete.title")}</DialogTitle>
          <DialogDescription>{t("delete.description")}</DialogDescription>
        </DialogHeader>
        {mutation.isError ? (
          <ErrorState
            title={t("delete.failed")}
            error={mutation.error}
          />
        ) : null}
        <DialogFooter className="gap-4">
          <DialogClose asChild>
            <Button
              variant="outline"
              size="lg"
              disabled={mutation.isPending}
            >
              {t("delete.keep")}
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            size="lg"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
            {t("delete.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
