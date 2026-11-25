import type { ComponentProps, ReactNode } from "react"
import { useCallback, useRef, useState } from "react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { AlertTriangle, Ellipsis, GripVertical } from "lucide-react"
import { useTranslation } from "react-i18next"

import { HelpTooltipContent } from "@/components/atoms/HelpTooltipContent"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { TableCell, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import type {
  AssignmentParticipant,
  AssignmentRoom,
  RoomWarning,
  UnassignedParticipant,
} from "@/features/events/api/room-assignments"
import {
  participantName,
  useAssignmentLabels,
} from "@/features/events/components/room-assignment-labels"
import { RoomWarningMark, RoomWarningStrip } from "@/features/events/components/RoomWarnings"

/** What is being dragged: a participant of the unassigned list, or one taken out of a room. */
export type DragData = { applicationTermId: string; name: string; fromRoomId: string | null }

const chipClass =
  "inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-lg border border-border bg-secondary px-2 py-1 text-sm"

/** The chip that follows the pointer while dragging. */
export function ParticipantGhost({ name }: { name: string }) {
  return (
    <span className={cn(chipClass, "cursor-grabbing bg-card shadow-md")}>
      <GripVertical
        className="size-3 text-muted-foreground"
        aria-hidden
      />
      {name}
    </span>
  )
}

/** A participant sitting in a room: click opens the actions (move, remove), the chip can be dragged. */
export function ParticipantChip({
  participant,
  room,
  scope,
  onMove,
  onRemove,
}: {
  participant: AssignmentParticipant
  room: AssignmentRoom
  /** The table and the mobile cards are both in the DOM; their draggables need their own ids. */
  scope: "row" | "card"
  onMove: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation("events")
  const { roomTitle } = useAssignmentLabels()
  const isBlock = scope === "card"
  const name = participantName(participant)
  const data: DragData = {
    applicationTermId: participant.applicationTermId,
    name,
    fromRoomId: room.id,
  }
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `chip:${scope}:${participant.applicationTermId}`,
    data,
  })
  // Radix opens its trigger on pointer down, which would fight the drag; so the chip opens the
  // menu on click and the trigger is only an invisible anchor over it.
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  // A stable ref callback: a new one per render would detach the draggable mid-drag.
  const setRefs = useCallback(
    (node: HTMLButtonElement | null) => {
      buttonRef.current = node
      setNodeRef(node)
    },
    [setNodeRef],
  )
  const trigger = (
    <button
      {...attributes}
      {...listeners}
      ref={setRefs}
      type="button"
      aria-haspopup={isBlock ? "dialog" : "menu"}
      {...(!isBlock && { "aria-expanded": isOpen })}
      aria-label={t("roomAssignments.participantMenu", { name })}
      onClick={isBlock ? undefined : () => setIsOpen((isShown) => !isShown)}
      className={cn(
        chipClass,
        isBlock && "min-h-11 w-full justify-start",
        "cursor-grab touch-manipulation outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        isDragging && "opacity-40",
      )}
    >
      <GripVertical
        className="size-3 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <span className="min-w-0 break-words">{name}</span>
      {participant.individualAccommodation ? (
        <IndividualBadge
          note={participant.accommodationRequest}
          className="ml-1 bg-card"
        >
          {t("roomAssignments.individualShort")}
        </IndividualBadge>
      ) : null}
      {isBlock ? (
        <Ellipsis
          className="ml-auto size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      ) : null}
    </button>
  )
  if (isBlock) {
    return (
      <Sheet>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="gap-0 rounded-t-xl bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SheetTitle className="text-sm font-medium">{name}</SheetTitle>
          <SheetDescription className="mt-1 mb-2">{roomTitle(room)}</SheetDescription>
          <div className="divide-y divide-border border-t border-border">
            <SheetClose asChild>
              <Button
                variant="ghost"
                className="min-h-14 w-full justify-start rounded-none px-0 text-base font-normal"
                onClick={onMove}
              >
                {t("roomAssignments.move")}
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button
                variant="ghost"
                className="min-h-14 w-full justify-start rounded-none px-0 text-base font-normal"
                onClick={onRemove}
              >
                {t("roomAssignments.remove")}
              </Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    )
  }
  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <span className="relative inline-flex">
        {trigger}
        <DropdownMenuTrigger asChild>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
          />
        </DropdownMenuTrigger>
      </span>
      <DropdownMenuContent
        align="start"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          buttonRef.current?.focus()
        }}
      >
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {name}
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={onMove}>{t("roomAssignments.move")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={onRemove}>{t("roomAssignments.remove")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** A confirmed / to-evaluate participant without a room: name, gender and status, and "Assign". */
export function UnassignedRow({
  participant,
  isFirst,
  isDisabled,
  onAssign,
}: {
  participant: UnassignedParticipant
  isFirst: boolean
  isDisabled: boolean
  onAssign: () => void
}) {
  const { t } = useTranslation("events")
  const { genderLabel, statusLabel } = useAssignmentLabels()
  const name = participantName(participant)
  const data: DragData = {
    applicationTermId: participant.applicationTermId,
    name,
    fromRoomId: null,
  }
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `row:${participant.applicationTermId}`,
    data,
    disabled: isDisabled,
  })
  return (
    <li
      className={cn(
        "flex items-center gap-3 px-3 py-2",
        !isFirst && "border-t border-border",
        isDragging && "opacity-40",
      )}
    >
      <div
        {...attributes}
        {...listeners}
        ref={setNodeRef}
        className={cn("flex min-w-0 flex-1 items-center gap-2", !isDisabled && "cursor-grab")}
      >
        <GripVertical
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium break-words">{name}</span>
            {participant.individualAccommodation ? (
              <IndividualBadge
                note={participant.accommodationRequest}
                className="max-w-full shrink whitespace-normal"
              >
                {t("roomAssignments.individual")}
              </IndividualBadge>
            ) : null}
          </span>
          <span className="text-sm text-muted-foreground">
            {genderLabel(participant.gender)} · {statusLabel(participant.status)}
          </span>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 max-lg:h-11"
        disabled={isDisabled}
        aria-label={t("roomAssignments.assignAria", { name })}
        onClick={onAssign}
      >
        {t("roomAssignments.assign")}
      </Button>
    </li>
  )
}

/** Badge of an individual accommodation request; a tooltip shows the applicant's note on hover. */
function IndividualBadge({
  note,
  className,
  children,
}: {
  note: string | null
  className?: string
  children: ReactNode
}) {
  const text = note?.trim()
  if (!text) {
    return (
      <Badge
        variant="secondary"
        className={className}
      >
        {children}
      </Badge>
    )
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className={className}
            tabIndex={0}
          >
            {children}
          </Badge>
        </TooltipTrigger>
        <HelpTooltipContent isLong>
          <p className="break-words whitespace-pre-line">{text}</p>
        </HelpTooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

type RoomProps = {
  placementSequence?: number
  room: AssignmentRoom
  /** Something is being dragged and this room can take them (a full one as an extra bed) and is not the dragged one's own. */
  isEligible: boolean
  /** Rule warnings of this room (US-37). */
  warnings: RoomWarning[]
  onAcknowledge: (warning: RoomWarning, room: AssignmentRoom) => void
  isDragActive: boolean
  actions: ReactNode
  onMoveParticipant: (participant: AssignmentParticipant) => void
  onRemoveParticipant: (participant: AssignmentParticipant) => void
}

function Chips({
  room,
  scope,
  onMoveParticipant,
  onRemoveParticipant,
}: Pick<RoomProps, "room" | "onMoveParticipant" | "onRemoveParticipant"> & {
  scope: "row" | "card"
}) {
  return (
    <div className={scope === "card" ? "grid gap-1.5" : "flex flex-wrap gap-1.5"}>
      {room.participants.map((participant) => (
        <ParticipantChip
          key={participant.applicationTermId}
          participant={participant}
          room={room}
          scope={scope}
          onMove={() => onMoveParticipant(participant)}
          onRemove={() => onRemoveParticipant(participant)}
        />
      ))}
    </div>
  )
}

function AssignedParticipants({
  room,
  scope,
  onMoveParticipant,
  onRemoveParticipant,
}: ComponentProps<typeof Chips>) {
  const { t } = useTranslation("events")
  const first = room.participants[0]
  if (!first) return null

  const name = participantName(first)
  const remaining = room.participants.length - 1
  const summary = remaining
    ? t("roomAssignments.listPreview", { first: name, count: remaining })
    : name
  return (
    <Accordion
      type="single"
      collapsible
    >
      <AccordionItem value={room.id}>
        <AccordionTrigger
          className="min-h-11 items-center gap-2 py-2"
          aria-label={t("roomAssignments.listLabel", {
            list: t("roomAssignments.participantsColumn"),
            summary,
          })}
        >
          <span className="min-w-0 wrap-anywhere">{summary}</span>
        </AccordionTrigger>
        <AccordionContent className="pb-2">
          <Chips
            room={room}
            scope={scope}
            onMoveParticipant={onMoveParticipant}
            onRemoveParticipant={onRemoveParticipant}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export function ExtraBeds({ room }: { room: AssignmentRoom }) {
  const { t } = useTranslation("events")
  return room.extraBeds > 0 ? (
    <Badge
      variant="info"
      className="print:hidden"
    >
      {t("roomAssignments.extraBeds", { count: room.extraBeds })}
    </Badge>
  ) : null
}

/** The kinds of the warnings nobody has confirmed yet, which the room is marked with. */
const openKinds = (warnings: RoomWarning[]): RoomWarning["kind"][] =>
  warnings.filter((warning) => !warning.acknowledged).map((warning) => warning.kind)

/** Decorative M28 feedback. Only a successful placement issues a new sequence. */
function PlacementMark({ sequence }: { sequence?: number }) {
  return sequence ? (
    <span
      key={sequence}
      aria-hidden="true"
      className="placement-mark"
    >
      <span />
    </span>
  ) : null
}

function Occupancy({
  room,
  placementSequence,
  warnings,
  isDropping,
}: {
  room: AssignmentRoom
  warnings: RoomWarning[]
  isDropping: boolean
  placementSequence?: number
}) {
  const { t } = useTranslation("events")
  const { freeBedsLabel } = useAssignmentLabels()
  const kinds = openKinds(warnings)
  return (
    <div className="flex flex-col items-start gap-1 text-sm">
      <span className="relative px-2 py-1 font-medium tabular-nums">
        <PlacementMark sequence={placementSequence} />
        {room.participants.length} / {room.beds}
      </span>
      {kinds.includes("OVERCROWDED") ? null : (
        <span className={cn("font-medium", isDropping ? "text-link" : "text-muted-foreground")}>
          {isDropping ? t("roomAssignments.dropHere") : freeBedsLabel(room)}
        </span>
      )}
      <ExtraBeds room={room} />
    </div>
  )
}

export function WarningLabels({ warnings }: { warnings: RoomWarning[] }) {
  const { t } = useTranslation("events")
  const kinds = openKinds(warnings)
  const chips = [
    kinds.includes("OVERCROWDED") ? t("roomWarnings.overcrowdedLabel") : null,
    kinds.includes("MIXED_GENDER") ? t("roomWarnings.mixedGenderLabel") : null,
  ].filter((label): label is string => label !== null)
  return (
    <>
      {chips.map((label) => (
        <Badge
          key={label}
          variant="warning"
          className="gap-1"
        >
          <AlertTriangle
            className="size-3"
            aria-hidden
          />
          {label}
        </Badge>
      ))}
      {warnings
        .filter((warning) => warning.acknowledged)
        .map((warning) => (
          <RoomWarningMark
            key={warning.kind}
            warning={warning}
          />
        ))}
    </>
  )
}

/** Warning strips of a room; marked for the jump from the summary. */
function Strips({
  room,
  warnings,
  onAcknowledge,
}: Pick<RoomProps, "room" | "warnings" | "onAcknowledge">) {
  return warnings.map((warning) => (
    <div
      key={warning.kind}
      data-room-warning={warning.acknowledged ? "acknowledged" : "open"}
    >
      <RoomWarningStrip
        room={room}
        warning={warning}
        onAcknowledge={onAcknowledge}
      />
    </div>
  ))
}

/** The panel of the unassigned: dropping a person from a room on it removes them from the room. */
export function UnassignedDropZone({
  isDragActive,
  panelRef,
  className,
  children,
}: {
  /** A person sitting in a room is being dragged, so the panel is a valid target. */
  isDragActive: boolean
  panelRef: (element: HTMLDivElement | null) => void
  className?: string
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "unassigned", data: { isUnassigned: true } })
  const setRefs = useCallback(
    (element: HTMLDivElement | null) => {
      setNodeRef(element)
      panelRef(element)
    },
    [setNodeRef, panelRef],
  )
  return (
    <div
      ref={setRefs}
      className={cn(
        className,
        isDragActive &&
          (isOver ? "bg-accent outline-2 -outline-offset-2 outline-ring" : "bg-muted"),
      )}
    >
      {children}
    </div>
  )
}

/** Desktop row of a room: name with its gender, people as chips, occupancy and the room actions. */
export function RoomTableRow({
  room,
  isEligible,
  placementSequence,
  warnings,
  onAcknowledge,
  isDragActive,
  actions,
  onMoveParticipant,
  onRemoveParticipant,
}: RoomProps) {
  const { t } = useTranslation("events")
  const { roomGenderLabel } = useAssignmentLabels()
  const { setNodeRef, isOver } = useDroppable({
    id: `row:${room.id}`,
    data: { roomId: room.id },
  })
  const isDropping = isEligible && isOver
  const isWarned = openKinds(warnings).length > 0
  return (
    <>
      <TableRow
        ref={setNodeRef}
        className={cn(
          isDropping
            ? "bg-accent outline-2 -outline-offset-2 outline-ring"
            : isEligible && isDragActive
              ? "bg-muted"
              : isWarned && "bg-status-warning-bg hover:bg-status-warning-bg",
          openKinds(warnings).length > 0 && "border-b-0",
        )}
      >
        <TableCell
          aria-label={room.name}
          className={cn(
            "pl-4 whitespace-normal",
            isWarned && "shadow-[inset_4px_0_0_0_var(--color-status-warning)]",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-6 text-right font-bold tabular-nums">{room.name}</span>
            {room.gender ? <Badge variant="secondary">{roomGenderLabel(room.gender)}</Badge> : null}
            {room.individual ? <Badge variant="secondary">{t("rooms.individual")}</Badge> : null}
            <WarningLabels warnings={warnings} />
          </div>
        </TableCell>
        <TableCell className="min-w-40 whitespace-normal">
          <AssignedParticipants
            room={room}
            scope="row"
            onMoveParticipant={onMoveParticipant}
            onRemoveParticipant={onRemoveParticipant}
          />
        </TableCell>
        <TableCell className="w-32">
          <Occupancy
            placementSequence={placementSequence}
            room={room}
            warnings={warnings}
            isDropping={isDropping}
          />
        </TableCell>
        <TableCell className="w-px pr-4">
          <div className="flex items-center justify-end gap-1">{actions}</div>
        </TableCell>
      </TableRow>
      {openKinds(warnings).length > 0 ? (
        <TableRow className="hover:bg-transparent">
          <TableCell
            colSpan={4}
            className={cn(
              "p-0",
              isWarned && "shadow-[inset_4px_0_0_0_var(--color-status-warning)]",
            )}
          >
            <Strips
              room={room}
              warnings={warnings}
              onAcknowledge={onAcknowledge}
            />
          </TableCell>
        </TableRow>
      ) : null}
    </>
  )
}

/** Mobile card of a room: title, occupancy with a bar, the people stacked, then the room actions. */
export function RoomCard({
  room,
  isEligible,
  placementSequence,
  warnings,
  onAcknowledge,
  isDragActive,
  actions,
  onMoveParticipant,
  onRemoveParticipant,
}: RoomProps) {
  const { t } = useTranslation("events")
  const { roomGenderLabel, freeBedsLabel } = useAssignmentLabels()
  const { setNodeRef, isOver } = useDroppable({
    id: `card:${room.id}`,
    data: { roomId: room.id },
  })
  const isDropping = isEligible && isOver
  const isFull = room.participants.length >= room.beds
  const kinds = openKinds(warnings)
  const share = Math.min(100, Math.round((room.participants.length / Math.max(1, room.beds)) * 100))
  return (
    <li
      ref={setNodeRef}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border bg-card",
        isDropping
          ? "bg-accent outline-2 -outline-offset-2 outline-ring"
          : isEligible && isDragActive
            ? "bg-muted"
            : kinds.length > 0 && "border-l-4 border-l-status-warning bg-status-warning-bg",
      )}
    >
      <div className="flex flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold break-words">{room.name}</span>
          {room.gender ? <Badge variant="secondary">{roomGenderLabel(room.gender)}</Badge> : null}
          {room.individual ? <Badge variant="secondary">{t("rooms.individual")}</Badge> : null}
          <WarningLabels warnings={warnings} />
        </div>
        <div className="flex items-center gap-3">
          <span className="relative px-2 py-1 text-sm font-semibold whitespace-nowrap tabular-nums">
            <PlacementMark sequence={placementSequence} />
            {room.participants.length} / {room.beds}
          </span>
          <div
            role="presentation"
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
          >
            <div
              className={cn("h-full rounded-full", isFull ? "bg-muted-foreground" : "bg-primary")}
              style={{ width: `${share}%` }}
            />
          </div>
          {kinds.includes("OVERCROWDED") ? null : (
            <Badge variant={isFull ? "secondary" : "success"}>{freeBedsLabel(room)}</Badge>
          )}
        </div>
        <ExtraBeds room={room} />
      </div>
      {room.participants.length ? (
        <div className="border-t border-border px-3">
          <AssignedParticipants
            room={room}
            scope="card"
            onMoveParticipant={onMoveParticipant}
            onRemoveParticipant={onRemoveParticipant}
          />
        </div>
      ) : null}
      <Strips
        room={room}
        warnings={warnings}
        onAcknowledge={onAcknowledge}
      />
      <div className="flex items-center justify-end gap-1 border-t border-border px-3 py-1">
        {actions}
      </div>
    </li>
  )
}
