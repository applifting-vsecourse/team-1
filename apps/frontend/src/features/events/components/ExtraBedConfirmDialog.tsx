import { useMutation } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDateRange } from "@/lib/date"
import { cn } from "@/lib/utils"

import { assignRoom, type AssignmentRoom } from "@/features/events/api/room-assignments"
import { useAssignmentLabels } from "@/features/events/components/room-assignment-labels"

/** Who goes into the full room, and whether they are moved from another room. */
export type ExtraBedRequest = {
  applicationTermId: string
  name: string
  isMove: boolean
  room: AssignmentRoom
}

// A full room takes one more person only as an extra bed, after the organizer confirms it (US-37,
// D-112): the room gets +1 bed in this term and the participant goes onto it.
// Figma (Design system): Přiřazení nad kapacitu · dialog přistýlky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23410-95625 (mobile 23410-96392)
export function ExtraBedConfirmDialog({
  eventId,
  term,
  request,
  onClose,
  onDone,
}: {
  eventId: string
  term: { termId: string; startsOn: string; endsOn: string }
  request: ExtraBedRequest
  onClose: () => void
  onDone: (result: { roomTitle: string; isMoved: boolean }) => Promise<void>
}) {
  const { t } = useTranslation("events")
  const { roomTitle } = useAssignmentLabels()
  const { room, name } = request
  const mutation = useMutation({
    mutationFn: () =>
      assignRoom(eventId, term.termId, request.applicationTermId, room.id, [], true),
  })
  const isPending = mutation.isPending
  const confirm = async () => {
    if (isPending) return
    try {
      await mutation.mutateAsync()
    } catch {
      return
    }
    await onDone({ roomTitle: roomTitle(room), isMoved: request.isMove })
    onClose()
  }
  const rows: [string, string, boolean?][] = [
    [t("extraBedDialog.person"), name],
    [t("extraBedDialog.room"), roomTitle(room)],
    [
      t("extraBedDialog.term"),
      formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true }),
    ],
    [t("extraBedDialog.bedsAfter"), t("extraBedDialog.bedsAfterValue", { beds: room.beds }), true],
  ]
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !isPending) onClose()
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-card shadow-md sm:max-w-160">
        <DialogTitle>{t("extraBedDialog.title", { room: room.name })}</DialogTitle>
        <DialogDescription className="text-base">
          {t("extraBedDialog.description")}
        </DialogDescription>
        <dl className="flex flex-col divide-y divide-border rounded-lg border border-border text-sm">
          {rows.map(([label, value, isKey]) => (
            <div
              key={label}
              className={cn(
                "flex items-start justify-between gap-4 px-4 py-2.5",
                isKey && "bg-accent",
              )}
            >
              <dt className="text-muted-foreground">{label}</dt>
              <dd className={cn("text-right break-words", isKey ? "font-bold" : "font-medium")}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted-foreground">{t("extraBedDialog.explain")}</p>
        {mutation.isError ? (
          <ErrorState
            title={t("roomAssignments.failed")}
            error={mutation.error}
          />
        ) : null}
        <DialogFooter className="gap-4">
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={isPending}
            >
              {t("roomAssignments.cancel")}
            </Button>
          </DialogClose>
          <Button
            type="button"
            size="lg"
            disabled={isPending}
            onClick={() => void confirm()}
          >
            {isPending ? <Loader2 className="animate-spin" /> : null}
            {t("extraBedDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
