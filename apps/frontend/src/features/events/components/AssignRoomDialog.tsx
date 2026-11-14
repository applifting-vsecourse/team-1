import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { formatDateRange } from "@/lib/date"
import { cn } from "@/lib/utils"

import {
  assignRoom,
  type AssignmentOtherTerm,
  type AssignmentRoom,
} from "@/features/events/api/room-assignments"
import {
  freeBedCount,
  sameRoomName,
  useAssignmentLabels,
} from "@/features/events/components/room-assignment-labels"

/** Who is being assigned and where they are now (a participant in a room is moved). */
export type AssignTarget = {
  applicationTermId: string
  name: string
  gender: "FEMALE" | "MALE"
  status: "TO_EVALUATE" | "CONFIRMED" | "WAITLISTED" | "CANCELLED"
  currentRoomId: string | null
  alsoInTerms: AssignmentOtherTerm[]
}

const termLine = (term: { startsOn: string; endsOn: string }): string =>
  formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })

// Choose a room of the term for one participant (assign) or another room for a participant who has
// one (move); with an application in more terms the same room can be assigned in one step.
// Figma (Design system): Přiřadit účastníka do pokoje · dialog · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23444-97753 (mobile 23445-100086)
// Figma (Design system): Účastník ve dvou termínech · stejné lůžko · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23444-98424 (mobile 23445-100141)
// Figma (Design system): Přesunout účastníka · dialog · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23444-99815 (mobile 23445-100210)
export function AssignRoomDialog({
  eventId,
  term,
  rooms,
  target,
  initialRoomId,
  onClose,
  onDone,
}: {
  eventId: string
  term: { termId: string; startsOn: string; endsOn: string }
  rooms: AssignmentRoom[]
  target: AssignTarget
  initialRoomId?: string
  onClose: () => void
  onDone: (result: { roomTitle: string; isMoved: boolean }) => Promise<void>
}) {
  const { t } = useTranslation("events")
  const { genderLabel, statusLabel, roomTitle, freeBedsLabel } = useAssignmentLabels()
  const isMove = target.currentRoomId !== null
  const [roomId, setRoomId] = useState(initialRoomId ?? "")
  const [alsoIds, setAlsoIds] = useState<string[]>([])
  const [hasMissingRoom, setHasMissingRoom] = useState(false)
  const mutation = useMutation({
    mutationFn: () => assignRoom(eventId, term.termId, target.applicationTermId, roomId, alsoIds),
  })
  const selected = rooms.find((room) => room.id === roomId)
  const current = rooms.find((room) => room.id === target.currentRoomId)
  // Other terms that have a room of the same name as the one picked (AC3).
  const offers = selected
    ? target.alsoInTerms.flatMap((other) => {
        const match = other.rooms.find((room) => sameRoomName(room.name, selected.name))
        return match && !isMove ? [{ other, match }] : []
      })
    : []
  const checked = offers.filter(({ other }) => alsoIds.includes(other.termId))
  const isPending = mutation.isPending
  const submit = async () => {
    if (isPending) return
    if (!selected) {
      setHasMissingRoom(true)
      return
    }
    try {
      await mutation.mutateAsync()
    } catch {
      return
    }
    await onDone({ roomTitle: roomTitle(selected), isMoved: isMove })
    onClose()
  }
  const name = target.name
  const result = !selected
    ? null
    : isMove
      ? t("roomAssignments.moveResult", {
          name,
          room: selected.name,
          from: current ? current.name : "",
        })
      : checked.length
        ? t("roomAssignments.alsoResult", {
            name,
            room: selected.name,
            terms: [termLine(term), ...checked.map(({ other }) => termLine(other))].join(" a "),
          })
        : t("roomAssignments.assignResult", { name, room: selected.name })
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !isPending) onClose()
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-card shadow-md sm:max-w-170">
        <DialogTitle>
          {t(isMove ? "roomAssignments.moveTitle" : "roomAssignments.assignTitle")}
        </DialogTitle>
        <DialogDescription className="text-base">
          {isMove
            ? t("roomAssignments.moveDescription", {
                name,
                room: current ? current.name : "",
                term: termLine(term),
              })
            : target.alsoInTerms.length
              ? t("roomAssignments.alsoDescription", {
                  name,
                  gender: genderLabel(target.gender),
                  status: statusLabel(target.status),
                  other: target.alsoInTerms.map(termLine).join(", "),
                })
              : t("roomAssignments.assignDescription", {
                  name,
                  gender: genderLabel(target.gender),
                  status: statusLabel(target.status),
                  term: termLine(term),
                })}
        </DialogDescription>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <RadioGroup
            aria-label={t("roomAssignments.roomChoice")}
            value={roomId}
            onValueChange={(value) => {
              setRoomId(value)
              setAlsoIds([])
              setHasMissingRoom(false)
            }}
            className="gap-0 overflow-hidden rounded-lg border border-border"
          >
            {rooms.map((room, index) => {
              const isCurrent = room.id === target.currentRoomId
              const isFull = freeBedCount(room) === 0
              const isDisabled = isCurrent || isFull
              return (
                <Label
                  key={room.id}
                  htmlFor={`assign-room-${room.id}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-base font-normal",
                    index > 0 && "border-t border-border",
                    room.id === roomId && "bg-accent",
                    isDisabled && "text-muted-foreground",
                  )}
                >
                  <RadioGroupItem
                    id={`assign-room-${room.id}`}
                    value={room.id}
                    disabled={isDisabled}
                  />
                  <span className="min-w-0 flex-1 break-words">
                    {isCurrent
                      ? t("roomAssignments.currentRoom", { room: roomTitle(room) })
                      : roomTitle(room)}
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {isCurrent ? `${room.participants.length} / ${room.beds}` : freeBedsLabel(room)}
                  </span>
                </Label>
              )
            })}
          </RadioGroup>
          {hasMissingRoom ? (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {t("roomAssignments.pickRoom")}
            </p>
          ) : null}
          {offers.map(({ other, match }) => (
            <div
              key={other.termId}
              className="flex items-start gap-3"
            >
              <Checkbox
                id={`also-${other.termId}`}
                disabled={match.freeBeds <= 0}
                checked={alsoIds.includes(other.termId)}
                onCheckedChange={(value) =>
                  setAlsoIds((ids) =>
                    value === true
                      ? [...ids, other.termId]
                      : ids.filter((id) => id !== other.termId),
                  )
                }
              />
              <Label
                htmlFor={`also-${other.termId}`}
                className="text-base font-normal"
              >
                {t("roomAssignments.also", {
                  term: termLine(other),
                  room: roomTitle({ ...match, extraBeds: 0 }),
                })}
                {match.freeBeds <= 0 ? ` · ${t("roomAssignments.full")}` : ""}
              </Label>
            </div>
          ))}
          {result ? <p className="text-sm text-muted-foreground">{result}</p> : null}
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
              type="submit"
              size="lg"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {t(isMove ? "roomAssignments.moveSave" : "roomAssignments.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
