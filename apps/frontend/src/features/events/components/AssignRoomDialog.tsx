import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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
  participantInitials,
  sameRoomName,
  useAssignmentLabels,
} from "@/features/events/components/room-assignment-labels"

/** Who is being assigned and where they are now (a participant in a room is moved). */
export type AssignTarget = {
  applicationTermId: string
  name: string
  firstName: string
  lastName: string
  gender: "FEMALE" | "MALE"
  status: "TO_EVALUATE" | "CONFIRMED" | "WAITLISTED" | "CANCELLED"
  currentRoomId: string | null
  alsoInTerms: AssignmentOtherTerm[]
}

const termLine = (term: { startsOn: string; endsOn: string }): string =>
  formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })

// Choose a room of the term for one participant (assign) or another room for a participant who has
// one (move); with an application in more terms the same room can be assigned in one step.
// Layout is an approved improvement over the frames: participant card on top, rooms as cards.
// Figma (Design system): Přiřadit účastníka do pokoje · dialog · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23444-97753 (mobile 23445-100086)
// Figma (Design system): Účastník ve dvou termínech · stejné lůžko · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23444-98424 (mobile 23445-100141)
// Figma (Design system): Přesunout účastníka · dialog · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23444-99815 (mobile 23445-100210)
export function AssignRoomDialog({
  eventId,
  term,
  rooms,
  target,
  onClose,
  onDone,
}: {
  eventId: string
  term: { termId: string; startsOn: string; endsOn: string }
  rooms: AssignmentRoom[]
  target: AssignTarget
  onClose: () => void
  onDone: (result: { roomTitle: string; isMoved: boolean }) => Promise<void>
}) {
  const { t } = useTranslation("events")
  const { genderLabel, roomGenderLabel, statusLabel, roomTitle, freeBedsLabel } =
    useAssignmentLabels()
  const isMove = target.currentRoomId !== null
  const [roomId, setRoomId] = useState("")
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
          {t(isMove ? "roomAssignments.moveDescription" : "roomAssignments.assignDescription", {
            term: termLine(term),
          })}
        </DialogDescription>
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
            <Avatar size="lg">
              <AvatarFallback>{participantInitials(target)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="font-semibold break-words">{name}</span>
              <span className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary">{genderLabel(target.gender)}</Badge>
                <Badge variant={target.status === "TO_EVALUATE" ? "info" : "success"}>
                  {statusLabel(target.status, target.gender)}
                </Badge>
                {current ? (
                  <span className="text-sm text-muted-foreground">
                    {t("roomAssignments.nowIn", { room: roomTitle(current) })}
                  </span>
                ) : null}
              </span>
            </div>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{t("roomAssignments.roomChoice")}</legend>
            <RadioGroup
              aria-label={t("roomAssignments.roomChoice")}
              value={roomId}
              onValueChange={(value) => {
                setRoomId(value)
                setAlsoIds([])
                setHasMissingRoom(false)
              }}
              className="gap-2"
            >
              {rooms.map((room) => {
                const isCurrent = room.id === target.currentRoomId
                const isFull = freeBedCount(room) === 0
                const isDisabled = isCurrent || isFull
                return (
                  <Label
                    key={room.id}
                    htmlFor={`assign-room-${room.id}`}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-base font-normal",
                      room.id === roomId && "border-primary bg-accent",
                      isDisabled && "bg-muted text-muted-foreground",
                    )}
                  >
                    <RadioGroupItem
                      id={`assign-room-${room.id}`}
                      value={room.id}
                      disabled={isDisabled}
                    />
                    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium break-words">{room.name}</span>
                      {room.gender ? (
                        <Badge variant="secondary">{roomGenderLabel(room.gender)}</Badge>
                      ) : null}
                      {room.extraBeds > 0 ? (
                        <Badge variant="info">
                          {t("roomAssignments.extraBeds", { count: room.extraBeds })}
                        </Badge>
                      ) : null}
                    </span>
                    {isCurrent ? (
                      <Badge variant="secondary">{t("roomAssignments.currentBadge")}</Badge>
                    ) : (
                      <Badge variant={isFull ? "secondary" : "success"}>
                        {freeBedsLabel(room)}
                      </Badge>
                    )}
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
          </fieldset>
          {offers.length ? (
            <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">{t("roomAssignments.alsoTitle")}</p>
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
                    className="flex-col items-start gap-0.5 text-base font-normal"
                  >
                    <span>
                      {t("roomAssignments.also", {
                        term: termLine(other),
                        room: match.name,
                      })}
                    </span>
                    {match.freeBeds <= 0 ? (
                      <span className="text-sm text-muted-foreground">
                        {t("roomAssignments.alsoFull")}
                      </span>
                    ) : null}
                  </Label>
                </div>
              ))}
            </div>
          ) : null}
          {result ? (
            <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{result}</p>
          ) : null}
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
