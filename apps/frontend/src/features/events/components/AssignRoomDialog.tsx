import { useMemo, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { PendingButton } from "@/components/atoms/PendingButton"
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
import { cn } from "@/lib/utils"

import {
  assignRoom,
  type AssignmentOtherTerm,
  type AssignmentRoom,
} from "@/features/events/api/room-assignments"
import { AssignmentSaveError } from "@/features/events/components/AssignmentSaveError"
import {
  freeBedCount,
  sortRoomsForAssignment,
  useAssignmentLabels,
} from "@/features/events/components/room-assignment-labels"
import {
  joinList,
  otherTermOffers,
  termLine,
} from "@/features/events/components/room-assignment-terms"

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

// Choose a room of the term for one participant (assign) or another room for a participant who has
// one (move); with an application in more terms the same room is assigned there in one step (D-111).
// Only the room list scrolls (#536): header, participant and the bar with the summary and the
// buttons stay put. A term where the room is full is offered unchecked and, when checked, hands
// over to the extra bed dialog (#539, #540, D-112).
// Layout is an approved improvement over the frames: participant card on top, rooms as cards.
// Figma (Design system): Přiřadit účastníka do pokoje · dialog · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23444-97753 (mobile 23445-100086)
// Figma (Design system): Účastník ve dvou termínech · stejné lůžko · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23444-98424 (mobile 23445-100141)
// Figma (Design system): Přesunout účastníka · dialog · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23444-99815 (mobile 23445-100210)
// Figma (Design system): #536 dlouhý seznam, před výběrem · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=29404-114774 (mobile 29404-115112)
// Figma (Design system): #536 dlouhý seznam, po výběru, shrnutí v liště · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=29404-115185 (mobile 29404-115551)
// Figma (Design system): #539 dva termíny, předvybráno v obou · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=29404-115640 (mobile 29404-117056)
// Figma (Design system): #539 dva termíny, odškrtnuto · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=29404-115994 (mobile 29404-117144)
// Figma (Design system): #539 tři termíny, pokoj chybí a plný pokoj · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=29404-116345 (mobile 29404-117229)
// Figma (Design system): #539 tři termíny, plný pokoj zaškrtnutý, Pokračovat · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=29404-116699 (mobile 29404-117317)
export function AssignRoomDialog({
  eventId,
  term,
  rooms,
  target,
  onClose,
  onDone,
  onNeedsExtraBed,
}: {
  eventId: string
  term: { termId: string; startsOn: string; endsOn: string }
  rooms: AssignmentRoom[]
  target: AssignTarget
  onClose: () => void
  onDone: (result: { room: AssignmentRoom; isMoved: boolean }) => void
  /**
   * The picked room is full here or in a checked term: the extra bed dialog takes over (US-37).
   * `checkedTermIds` are the other terms the organizer ticked; without it all of them are offered.
   */
  onNeedsExtraBed: (room: AssignmentRoom, checkedTermIds?: string[]) => void
}) {
  const { t } = useTranslation("events")
  const { genderLabel, roomGenderLabel, statusLabel, roomTitle, freeBedsLabel } =
    useAssignmentLabels()
  const isMove = target.currentRoomId !== null
  const [roomId, setRoomId] = useState("")
  // What the organizer ticked or unticked by hand; everything else follows the default below.
  const [toggles, setToggles] = useState<Record<string, boolean>>({})
  const selected = rooms.find((room) => room.id === roomId)
  const current = rooms.find((room) => room.id === target.currentRoomId)
  const isSelectedFull = selected !== undefined && freeBedCount(selected) === 0
  // Other terms and what the room of the same name is there (#539); a move never touches them.
  const offers =
    selected && !isSelectedFull && !isMove ? otherTermOffers(target.alsoInTerms, selected.name) : []
  // Default: ticked where the room has a free bed; a full one stays unticked until the organizer
  // chooses the extra bed there, and a missing one cannot be ticked.
  const checked = offers.filter(
    ({ other, state }) => state !== "missing" && (toggles[other.termId] ?? state === "free"),
  )
  const alsoIds = checked.map(({ other }) => other.termId)
  const fullChecked = checked.filter(({ state }) => state === "full")
  const isExtraBedNeeded = fullChecked.length > 0
  const mutation = useMutation({
    mutationFn: () => assignRoom(eventId, term.termId, target.applicationTermId, roomId, alsoIds),
  })
  // Best place first; the overview and the table keep their own order.
  const offered = useMemo(
    () => sortRoomsForAssignment(rooms, target.gender),
    [rooms, target.gender],
  )
  const isPending = mutation.isPending
  const submit = async () => {
    if (isPending || !selected) return
    if (isSelectedFull) {
      onNeedsExtraBed(selected)
      onClose()
      return
    }
    if (isExtraBedNeeded) {
      onNeedsExtraBed(selected, alsoIds)
      onClose()
      return
    }
    try {
      await mutation.mutateAsync()
    } catch {
      return
    }
    onDone({ room: selected, isMoved: isMove })
    onClose()
  }
  const name = target.name
  const and = t("roomAssignments.and")
  const termsText = joinList([termLine(term), ...checked.map(({ other }) => termLine(other))], and)
  const result =
    !selected || isSelectedFull
      ? null
      : isMove
        ? t("roomAssignments.moveResult", {
            name,
            room: selected.name,
            from: current ? current.name : "",
          })
        : checked.length === 0
          ? t("roomAssignments.assignResult", { name, room: selected.name })
          : t(
              checked.length === 1
                ? "roomAssignments.alsoResult"
                : "roomAssignments.alsoResultMany",
              {
                name,
                room: selected.name,
                terms: termsText,
              },
            )
  const extraBedNote = isExtraBedNeeded
    ? t("roomAssignments.alsoExtraBed", {
        count: fullChecked.length,
        terms: joinList(
          fullChecked.map(({ other }) => termLine(other)),
          and,
        ),
      })
    : null
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !isPending) onClose()
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-3 overflow-hidden bg-card p-4 sm:max-h-[90dvh] sm:max-w-160 sm:gap-4 sm:p-6">
        <DialogTitle className="pr-10">
          {t(isMove ? "roomAssignments.moveTitle" : "roomAssignments.assignTitle")}
        </DialogTitle>
        <DialogDescription className="text-base">
          {t(isMove ? "roomAssignments.moveDescription" : "roomAssignments.assignDescription", {
            term: termLine(term),
          })}
        </DialogDescription>
        <form
          noValidate
          className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <div className="flex shrink-0 flex-col gap-0.5 rounded-lg border border-border px-3 py-2.5">
            <span className="text-sm font-medium break-words">{name}</span>
            <span className="text-sm text-muted-foreground">
              {genderLabel(target.gender)} · {statusLabel(target.status)}
              {current ? ` · ${t("roomAssignments.nowIn", { room: roomTitle(current) })}` : ""}
            </span>
          </div>
          <div className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain">
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">{t("roomAssignments.roomChoice")}</legend>
              <RadioGroup
                aria-label={t("roomAssignments.roomChoice")}
                value={roomId}
                onValueChange={(value) => {
                  setRoomId(value)
                  setToggles({})
                }}
                className="gap-2"
              >
                {offered.map((room) => {
                  const isCurrent = room.id === target.currentRoomId
                  const isFull = freeBedCount(room) === 0
                  const isDisabled = isCurrent
                  return (
                    <Label
                      key={room.id}
                      htmlFor={`assign-room-${room.id}`}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-base font-normal",
                        room.id === roomId && "border-primary bg-accent",
                        (isDisabled || isFull) && "bg-muted text-muted-foreground",
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
                        {room.individual ? (
                          <Badge variant="secondary">{t("rooms.individual")}</Badge>
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
            </fieldset>
            {offers.length ? (
              <div className="flex shrink-0 flex-col gap-3 rounded-lg border border-border p-3">
                <p className="text-sm font-medium">
                  {t(
                    offers.length > 1
                      ? "roomAssignments.alsoTitleMany"
                      : "roomAssignments.alsoTitle",
                  )}
                </p>
                {offers.map(({ other, match, state }) =>
                  state === "missing" || !match ? (
                    <p
                      key={other.termId}
                      className="text-sm text-muted-foreground"
                    >
                      {t("roomAssignments.alsoMissing", { term: termLine(other) })}
                    </p>
                  ) : (
                    <div
                      key={other.termId}
                      className="flex items-start gap-3"
                    >
                      <Checkbox
                        id={`also-${other.termId}`}
                        checked={alsoIds.includes(other.termId)}
                        onCheckedChange={(value) =>
                          setToggles((current) => ({ ...current, [other.termId]: value === true }))
                        }
                      />
                      <Label
                        htmlFor={`also-${other.termId}`}
                        className="flex-col items-start gap-0.5 text-base font-normal"
                      >
                        <span>
                          {t("roomAssignments.also", { term: termLine(other), room: match.name })}
                        </span>
                        {state === "full" ? (
                          <span className="text-sm text-muted-foreground">
                            {t("roomAssignments.alsoFull")}
                          </span>
                        ) : null}
                      </Label>
                    </div>
                  ),
                )}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col gap-3 border-t border-border pt-4">
            {mutation.isError ? (
              <AssignmentSaveError
                error={mutation.error}
                hasMoreTerms={alsoIds.length > 0}
              />
            ) : null}
            {selected ? (
              <div className="flex flex-col gap-1 rounded-lg bg-accent p-3 text-sm text-accent-foreground">
                <p className="hidden font-semibold sm:block">
                  {t("roomAssignments.pickedRoom", {
                    room: selected.name,
                    free: freeBedsLabel(selected),
                  })}
                </p>
                {result || extraBedNote ? (
                  <p className="font-medium">{[result, extraBedNote].filter(Boolean).join(" ")}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("roomAssignments.nothingPicked")}</p>
            )}
            <DialogFooter className="flex-row justify-end gap-2">
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
              <PendingButton
                isPending={isPending}
                type="submit"
                size="lg"
                className="max-sm:flex-1 sm:w-55"
                disabled={isPending || !selected}
              >
                {t(
                  isExtraBedNeeded
                    ? "roomAssignments.continue"
                    : isMove
                      ? "roomAssignments.moveSave"
                      : "roomAssignments.save",
                )}
              </PendingButton>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
