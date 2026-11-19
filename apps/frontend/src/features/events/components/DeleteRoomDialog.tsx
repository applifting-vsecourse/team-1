import { useMutation, useQuery } from "@tanstack/react-query"
import { AlertTriangle, Loader2 } from "lucide-react"
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
import { apiErrorCode } from "@/lib/api-client"
import { formatDateRange } from "@/lib/date"

import { roomAssignmentsQueryOptions } from "@/features/events/api/room-assignments"
import { deleteRoom, type Room, type TermRooms } from "@/features/events/api/rooms"

// Figma: Obsazený pokoj · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK?node-id=22592-87503 (mobile 22592-87651)
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
  const { t } = useTranslation(["events", "errors"])
  const mutation = useMutation({
    mutationFn: () => deleteRoom(term.eventId, term.termId, room.id),
    onSuccess: async () => {
      await onSaved()
      onClose()
    },
  })
  const { data: assignments } = useQuery(roomAssignmentsQueryOptions(term.eventId, term.termId))
  const isOccupied =
    Boolean(
      assignments?.rooms.find((candidate) => candidate.id === room.id)?.participants.length,
    ) || apiErrorCode(mutation.error) === "ROOM_HAS_ASSIGNMENTS"
  const confirmed =
    assignments &&
    [
      ...assignments.unassigned,
      ...assignments.rooms.flatMap((candidate) => candidate.participants),
    ].filter((person) => person.status === "CONFIRMED").length
  const before =
    term.roomMode === "GENDERED" && room.gender ? term.capacity[room.gender] : term.capacity.total
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent
        className={
          isOccupied
            ? "max-h-[95dvh] overflow-y-auto bg-card p-4 shadow-md sm:max-w-160 sm:p-6"
            : "bg-card shadow-md sm:max-w-170"
        }
      >
        {isOccupied ? (
          <>
            <DialogTitle className="text-2xl">{t("rooms.deleteConfirm")}</DialogTitle>
            <DialogDescription>
              {room.name} · {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
            </DialogDescription>
            <dl className="grid gap-4">
              <div className="grid gap-2">
                <dt className="text-sm text-muted-foreground">{t("rooms.deleteCapacityAfter")}</dt>
                <dd className="font-semibold">
                  {t("roomWarnings.beds", { count: term.capacity.total - room.beds })}
                </dd>
              </div>
              {confirmed !== undefined && (
                <div className="grid gap-2">
                  <dt className="text-sm text-muted-foreground">{t("rooms.deleteAttendance")}</dt>
                  <dd className="font-semibold">{t("rooms.deletePeople", { count: confirmed })}</dd>
                </div>
              )}
            </dl>
            <Alert variant="destructive">
              <AlertTriangle aria-hidden />
              <AlertTitle>{t("rooms.deleteBlocked")}</AlertTitle>
              <AlertDescription>{t("errors:ROOM_HAS_ASSIGNMENTS")}</AlertDescription>
            </Alert>
          </>
        ) : (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase">
              {term.eventName} ·{" "}
              {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
            </p>
            <div className="flex items-center justify-between gap-4 pr-8">
              <DialogTitle>{t("rooms.deleteTitle", { name: room.name })}</DialogTitle>
            </div>
            <Alert className="border-status-warning bg-status-warning-bg p-6">
              <AlertTitle className="text-lg text-status-warning">
                {t(
                  term.roomMode === "SHARED"
                    ? "rooms.deleteImpact"
                    : room.gender === "FEMALE"
                      ? "rooms.deleteFemaleImpact"
                      : "rooms.deleteMaleImpact",
                  { before, count: before - room.beds },
                )}
              </AlertTitle>
              <AlertDescription>
                {t("rooms.deleteImpactHint", { name: room.name, count: room.beds })}
              </AlertDescription>
            </Alert>
            <DialogDescription className="text-base text-foreground">
              {room.name}
              {room.gender
                ? ` · ${t(room.gender === "FEMALE" ? "rooms.female" : "rooms.male")}`
                : ""}{" "}
              · {t("rooms.beds", { count: room.beds })}
            </DialogDescription>
            <p className="text-sm text-muted-foreground">{t("rooms.deleteHint")}</p>
          </>
        )}
        {mutation.isError && !isOccupied ? (
          <ErrorState
            title={t("rooms.saveFailed")}
            error={mutation.error}
          />
        ) : null}
        <DialogFooter className={isOccupied ? "flex-row justify-end gap-4" : "gap-4"}>
          <DialogClose asChild>
            <Button
              variant="outline"
              size="lg"
              disabled={mutation.isPending}
            >
              {t(isOccupied ? "roomAssignments.cancel" : "rooms.keep")}
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            size="lg"
            disabled={mutation.isPending || isOccupied}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
            {t(isOccupied ? "rooms.deleteAction" : "rooms.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
