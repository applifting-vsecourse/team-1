import { useMutation } from "@tanstack/react-query"
import { Loader2, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"

import { deleteRoom, type EventRooms, type Room } from "@/features/events/api/rooms"

// Figma (Design system): X21 / X21b · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12370-662
export function DeleteRoomDialog({
  event,
  room,
  onClose,
  onSaved,
}: {
  event: EventRooms
  room: Room
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { t } = useTranslation("events")
  const mutation = useMutation({
    mutationFn: () => deleteRoom(event.eventId, room.id),
    onSuccess: async () => {
      await onSaved()
      onClose()
    },
  })
  const before =
    event.roomMode === "GENDERED" && room.gender
      ? event.capacity[room.gender]
      : event.capacity.total
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="bg-card shadow-md sm:max-w-170"
      >
        <p className="text-xs font-medium text-muted-foreground uppercase">{event.eventName}</p>
        <div className="flex items-center justify-between gap-4">
          <DialogTitle>{t("rooms.deleteTitle", { name: room.name })}</DialogTitle>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={mutation.isPending}
              aria-label={t("rooms.close")}
            >
              <X />
            </Button>
          </DialogClose>
        </div>
        <Alert className="border-status-warning bg-status-warning-bg p-6">
          <AlertTitle className="text-lg text-status-warning">
            {t(
              event.roomMode === "SHARED"
                ? "rooms.deleteImpact"
                : room.gender === "FEMALE"
                  ? "rooms.deleteFemaleImpact"
                  : "rooms.deleteMaleImpact",
              { before, after: before - room.capacity },
            )}
          </AlertTitle>
          <AlertDescription>
            {t("rooms.deleteImpactHint", { name: room.name, count: room.capacity })}
          </AlertDescription>
        </Alert>
        <DialogDescription className="text-base text-foreground">
          {room.name}
          {room.gender
            ? ` · ${t(room.gender === "FEMALE" ? "rooms.female" : "rooms.male")}`
            : ""} · {t("rooms.beds", { count: room.capacity })}
        </DialogDescription>
        <p className="text-sm text-muted-foreground">{t("rooms.deleteHint")}</p>
        {mutation.isError ? (
          <ErrorState
            title={t("rooms.saveFailed")}
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
              {t("rooms.keep")}
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            size="lg"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
            {t("rooms.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
