import { useMutation } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDateRange } from "@/lib/date"

import { deleteRoom, type Room, type TermRooms } from "@/features/events/api/rooms"

// Figma (Design system): X21 / X21b · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12370-662
export function DeleteRoomDialog({
  term,
  room,
  onClose,
  onSaved,
}: {
  term: TermRooms
  room: Room
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { t } = useTranslation("events")
  const mutation = useMutation({
    mutationFn: () => deleteRoom(term.eventId, term.termId, room.id),
    onSuccess: async () => {
      await onSaved()
      onClose()
    },
  })
  const before =
    term.roomMode === "GENDERED" && room.gender ? term.capacity[room.gender] : term.capacity.total
  const occupiedBy = room.occupiedBy ?? { FEMALE: 0, MALE: 0 }
  const occupied = occupiedBy.FEMALE + occupiedBy.MALE
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent
        className="bg-card shadow-md sm:max-w-170"
        aria-describedby={undefined}
      >
        <p className="text-xs font-medium text-muted-foreground uppercase">
          {term.eventName} · {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
        </p>
        <div className="flex items-center justify-between gap-4 pr-8">
          <DialogTitle>{t("rooms.deleteTitle", { name: room.name })}</DialogTitle>
        </div>
        <Alert className="border-status-warning bg-status-warning-bg p-6">
          <AlertTitle className="line-clamp-none text-lg text-status-warning">
            {room.individual
              ? t(occupied > 0 ? "rooms.deleteIndividualImpact" : "rooms.deleteIndividualEmpty", {
                  femaleBefore: term.capacity.FEMALE,
                  femaleAfter: term.capacity.FEMALE - occupiedBy.FEMALE,
                  maleBefore: term.capacity.MALE,
                  maleAfter: term.capacity.MALE - occupiedBy.MALE,
                })
              : t(
                  term.roomMode === "SHARED"
                    ? "rooms.deleteImpact"
                    : room.gender === "FEMALE"
                      ? "rooms.deleteFemaleImpact"
                      : "rooms.deleteMaleImpact",
                  { before, count: before - room.beds },
                )}
          </AlertTitle>
          {room.individual && occupied > 0 ? (
            // Its beds count into the capacity only while occupied (US-145).
            <AlertDescription>
              {t("rooms.deleteIndividualHint", { count: occupied })}
            </AlertDescription>
          ) : null}
        </Alert>
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
