import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

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
import { cn } from "@/lib/utils"

import {
  assignRoom,
  type AssignmentOtherTerm,
  type AssignmentRoom,
} from "@/features/events/api/room-assignments"
import { AssignmentSaveError } from "@/features/events/components/AssignmentSaveError"
import {
  freeBedCount,
  useAssignmentLabels,
} from "@/features/events/components/room-assignment-labels"
import {
  joinList,
  otherTermOffers,
  termLine,
} from "@/features/events/components/room-assignment-terms"

/** Who goes into the full room, and whether they are moved from another room. */
export type ExtraBedRequest = {
  applicationTermId: string
  name: string
  isMove: boolean
  room: AssignmentRoom
  /** Other terms of the participant; empty for a move and for a participant in one term (#540). */
  alsoInTerms: AssignmentOtherTerm[]
  /** Terms ticked in the assignment dialog; without it every term with the room is ticked. */
  checkedTermIds?: string[]
}

// A full room takes one more person only as an extra bed, after the organizer confirms it (US-37,
// D-112): the room gets +1 bed in this term and the participant goes onto it. A participant in more
// terms is placed in the room of the same name in every ticked term, with an extra bed in the
// terms where it is full (#540, one transaction). The bar with the buttons stays put (#536).
// Figma (Design system): Přiřazení nad kapacitu · dialog přistýlky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23410-95625 (mobile 23410-96392)
// Figma (Design system): #540 plný v obou termínech · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=29406-119007 (mobile 29406-121049)
// Figma (Design system): #540 plný jen v jednom termínu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=29406-119338 (mobile 29406-121140)
// Figma (Design system): #540 po Pokračovat z přiřazení · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=29406-119669 (mobile 29406-121231)
// Figma (Design system): #540 jeden termín odškrtnutý · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=29406-120013 (mobile 29406-121333)
// Figma (Design system): #540 pokoj v dalším termínu chybí · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=29406-120354 (mobile 29406-121432)
// Figma (Design system): #540 chyba, nic se neuložilo · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=29406-120698 (mobile 29406-121534)
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
  const offers = otherTermOffers(request.alsoInTerms, room.name)
  const hasTerms = offers.length > 0
  // What the organizer ticked or unticked by hand; everything else follows the carried choice.
  const [toggles, setToggles] = useState<Record<string, boolean>>({})
  const isOn = ({ other, state }: (typeof offers)[number]): boolean =>
    state !== "missing" &&
    (toggles[other.termId] ??
      (request.checkedTermIds ? request.checkedTermIds.includes(other.termId) : true))
  const checked = offers.filter(isOn)
  const alsoIds = checked.map(({ other }) => other.termId)
  const isFullHere = freeBedCount(room) === 0
  const mutation = useMutation({
    mutationFn: () =>
      assignRoom(eventId, term.termId, request.applicationTermId, room.id, alsoIds, true),
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
  // The terms the participant ends up in, and those among them that get an extra bed.
  const placed = [termLine(term), ...checked.map(({ other }) => termLine(other))]
  const withBed = [
    ...(isFullHere ? [termLine(term)] : []),
    ...checked.filter(({ state }) => state === "full").map(({ other }) => termLine(other)),
  ]
  const and = t("roomAssignments.and")
  const where =
    placed.length === 2 && offers.length === 1
      ? t("extraBedDialog.whereBoth")
      : t(placed.length === 1 ? "extraBedDialog.whereOne" : "extraBedDialog.whereMany", {
          terms: joinList(placed, and),
        })
  // "In both" only says it all when the participant is placed in exactly those two terms.
  const beds =
    withBed.length === 0
      ? null
      : withBed.length === 1
        ? t("extraBedDialog.bedsOne", { terms: withBed[0] })
        : withBed.length === placed.length
          ? t(withBed.length === 2 ? "extraBedDialog.bedsBoth" : "extraBedDialog.bedsAll")
          : t("extraBedDialog.bedsMany", { terms: joinList(withBed, and) })
  const result = beds
    ? t("extraBedDialog.resultBed", { name, room: room.name, where, beds })
    : t("extraBedDialog.resultNoBed", { name, room: room.name, where })
  const rows: [string, string, boolean?][] = [
    [t("extraBedDialog.person"), name],
    [t("extraBedDialog.room"), roomTitle(room)],
    ...(hasTerms
      ? []
      : ([
          [t("extraBedDialog.term"), termLine(term)],
          [
            t("extraBedDialog.bedsAfter"),
            t("extraBedDialog.bedsAfterValue", { beds: room.beds }),
            true,
          ],
        ] as [string, string, boolean?][])),
  ]
  const termRow = (
    id: string,
    label: string,
    kind: "bed" | "free" | "missing",
    beds: number,
    state: { isChecked: boolean; isLocked: boolean },
  ) => {
    const isOff = !state.isChecked && kind !== "missing"
    return (
      <li
        key={id}
        className="flex items-start gap-3"
      >
        <Checkbox
          id={`extra-${id}`}
          checked={state.isChecked}
          disabled={state.isLocked}
          onCheckedChange={(value) =>
            setToggles((current) => ({ ...current, [id]: value === true }))
          }
        />
        <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[1fr_auto] sm:gap-x-3">
          <Label
            htmlFor={`extra-${id}`}
            className="text-base font-normal sm:col-start-1 sm:row-start-1"
          >
            {label}
          </Label>
          <Badge
            variant={
              isOff || kind === "missing" ? "secondary" : kind === "bed" ? "warning" : "success"
            }
            className="justify-self-start sm:col-start-2 sm:row-start-1"
          >
            {t(
              isOff
                ? "extraBedDialog.badgeOff"
                : kind === "bed"
                  ? "extraBedDialog.badgeBed"
                  : kind === "free"
                    ? "extraBedDialog.badgeFree"
                    : "extraBedDialog.badgeSkipped",
            )}
          </Badge>
          <p className="text-sm text-muted-foreground sm:col-start-1 sm:row-start-2">
            {kind === "bed"
              ? t("extraBedDialog.bedsNote", { beds })
              : kind === "free"
                ? t("extraBedDialog.freeNote")
                : t("extraBedDialog.missingNote")}
          </p>
        </div>
      </li>
    )
  }
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !isPending) onClose()
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-3 overflow-hidden bg-card p-4 shadow-md sm:max-h-[90dvh] sm:max-w-160 sm:gap-4 sm:p-6">
        <DialogTitle>
          {hasTerms
            ? t("extraBedDialog.titleTerms", { room: room.name })
            : t("extraBedDialog.title", { room: room.name })}
        </DialogTitle>
        <DialogDescription className="text-base">
          {t(hasTerms ? "extraBedDialog.descriptionTerms" : "extraBedDialog.description")}
        </DialogDescription>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <dl className="flex flex-col divide-y divide-border rounded-lg border border-border text-sm">
            {rows.map(([label, value, isKey]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-4 px-4 py-2.5"
              >
                <dt className="text-muted-foreground">{label}</dt>
                <dd
                  className={cn("text-right break-words", isKey ? "font-semibold" : "font-medium")}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          {hasTerms ? (
            <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">{t("extraBedDialog.terms")}</p>
              <ul className="flex flex-col gap-3">
                {termRow(
                  term.termId,
                  t("extraBedDialog.thisTerm", { term: termLine(term) }),
                  isFullHere ? "bed" : "free",
                  room.beds,
                  { isChecked: true, isLocked: true },
                )}
                {offers.map((offer) =>
                  termRow(
                    offer.other.termId,
                    termLine(offer.other),
                    offer.state === "full" ? "bed" : offer.state,
                    offer.match?.beds ?? 0,
                    { isChecked: isOn(offer), isLocked: offer.state === "missing" },
                  ),
                )}
              </ul>
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {t(hasTerms ? "extraBedDialog.explainTerms" : "extraBedDialog.explain")}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-3 border-t border-border pt-4">
          {mutation.isError ? (
            <AssignmentSaveError
              error={mutation.error}
              hasMoreTerms={hasTerms}
            />
          ) : null}
          {hasTerms ? (
            <p className="rounded-lg bg-accent p-3 text-sm font-medium text-accent-foreground">
              {result}
            </p>
          ) : null}
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
            <Button
              type="button"
              size="lg"
              className="max-sm:flex-1 sm:w-55"
              disabled={isPending}
              onClick={() => void confirm()}
            >
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {t(withBed.length > 0 ? "extraBedDialog.confirm" : "roomAssignments.save")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
