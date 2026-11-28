import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { PendingButton } from "@/components/atoms/PendingButton"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import {
  acknowledgeRoomWarning,
  type AssignmentRoom,
  type RoomWarning,
} from "@/features/events/api/room-assignments"
import { useAssignmentLabels } from "@/features/events/components/room-assignment-labels"

export const WARNING_NOTE_MAX_LENGTH = 500

// Confirms a warning knowingly, with a note; it is kept with who and when, shown muted and no
// longer counted. The note is seen by the organizers of the event only.
// Figma (Design system): Potvrzení upozornění s poznámkou · dialog · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23410-96422 (mobile 23410-97186)
export function AcknowledgeWarningDialog({
  eventId,
  termId,
  warning,
  room,
  onClose,
  onDone,
}: {
  eventId: string
  termId: string
  warning: RoomWarning
  room: AssignmentRoom
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const { t } = useTranslation("events")
  const { roomTitle } = useAssignmentLabels()
  const [note, setNote] = useState("")
  const mutation = useMutation({
    mutationFn: () => acknowledgeRoomWarning(eventId, termId, warning, note.trim()),
  })
  const isPending = mutation.isPending
  const counted = room.participants.filter((person) => !person.individualAccommodation)
  const women = counted.filter((person) => person.gender === "FEMALE").length
  const submit = async () => {
    if (isPending) return
    try {
      await mutation.mutateAsync()
    } catch {
      return
    }
    await onDone()
    onClose()
  }
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !isPending) onClose()
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] min-h-[min(717px,calc(100dvh-2rem))] overflow-y-auto bg-card max-sm:top-4 max-sm:translate-y-0 sm:min-h-[min(497px,calc(100dvh-2rem))] sm:max-w-160">
        <DialogTitle className="pr-14 text-2xl leading-8 font-bold">
          {t("acknowledgeDialog.title")}
        </DialogTitle>
        <DialogDescription className="text-base">
          {t("acknowledgeDialog.description")}
        </DialogDescription>
        <dl className="flex flex-col divide-y divide-border rounded-lg border border-border text-sm">
          <div className="flex items-start justify-between gap-4 px-4 py-2.5">
            <dt className="text-muted-foreground">{t("acknowledgeDialog.room")}</dt>
            <dd className="text-right font-medium break-words">{roomTitle(room)}</dd>
          </div>
          <div className="flex items-start justify-between gap-4 px-4 py-2.5">
            <dt className="text-muted-foreground">{t("acknowledgeDialog.warning")}</dt>
            <dd className="text-right font-bold break-words">
              {warning.kind === "MIXED_GENDER"
                ? t("acknowledgeDialog.mixedGenderValue", {
                    women: t("roomWarnings.women", { count: women }),
                    men: t("roomWarnings.men", { count: counted.length - women }),
                  })
                : t("acknowledgeDialog.overcrowdedValue", {
                    people: room.participants.length,
                    beds: room.beds,
                  })}
            </dd>
          </div>
        </dl>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="warning-note">{t("acknowledgeDialog.noteLabel")}</Label>
            <Textarea
              id="warning-note"
              className="min-h-28 px-4 py-3 text-base"
              value={note}
              maxLength={WARNING_NOTE_MAX_LENGTH}
              rows={4}
              aria-describedby="warning-note-hint"
              onChange={(event) => setNote(event.target.value)}
            />
            <p
              id="warning-note-hint"
              className="text-sm text-muted-foreground"
            >
              {t("acknowledgeDialog.noteHint")}
            </p>
          </div>
          {mutation.isError ? (
            <ErrorState
              title={t("acknowledgeDialog.failed")}
              error={mutation.error}
            />
          ) : null}
          <DialogFooter className="gap-4 sm:gap-2">
            <DialogClose asChild>
              <Button
                type="button"
                className="sm:w-55"
                variant="outline"
                size="lg"
                disabled={isPending}
              >
                {t("roomAssignments.cancel")}
              </Button>
            </DialogClose>
            <PendingButton
              isPending={isPending}
              type="submit"
              className="sm:w-55"
              size="lg"
            >
              {t("acknowledgeDialog.confirm")}
            </PendingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
