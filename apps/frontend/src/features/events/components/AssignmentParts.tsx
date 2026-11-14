import type { ReactNode } from "react"
import { useCallback, useRef, useState } from "react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { GripVertical } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

import type {
  AssignmentParticipant,
  AssignmentRoom,
  UnassignedParticipant,
} from "@/features/events/api/room-assignments"
import {
  participantName,
  useAssignmentLabels,
} from "@/features/events/components/room-assignment-labels"

/** What is being dragged: a participant of the unassigned list, or one taken out of a room. */
export type DragData = { applicationTermId: string; name: string; fromRoomId: string | null }

const chipClass =
  "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-secondary px-2 py-1 text-sm"

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
  roomId,
  scope,
  isBlock = false,
  onMove,
  onRemove,
}: {
  participant: AssignmentParticipant
  roomId: string
  /** A full-width chip, as in the stacked list of a mobile room card. */
  isBlock?: boolean
  /** The table and the mobile cards are both in the DOM; their draggables need their own ids. */
  scope: "row" | "card"
  onMove: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation("events")
  const name = participantName(participant)
  const data: DragData = {
    applicationTermId: participant.applicationTermId,
    name,
    fromRoomId: roomId,
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
  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <span className={cn("relative inline-flex", isBlock && "flex w-full")}>
        <button
          {...attributes}
          {...listeners}
          ref={setRefs}
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={t("roomAssignments.participantMenu", { name })}
          onClick={() => setIsOpen((isShown) => !isShown)}
          className={cn(
            chipClass,
            isBlock && "w-full justify-start",
            "cursor-grab touch-manipulation outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            isDragging && "opacity-40",
          )}
        >
          <GripVertical
            className="size-3 text-muted-foreground"
            aria-hidden
          />
          {name}
        </button>
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
        "flex items-center gap-2.5 px-3 py-2.5",
        !isFirst && "border-t border-border",
        isDragging && "opacity-40",
      )}
    >
      <div
        {...attributes}
        {...listeners}
        ref={setNodeRef}
        className={cn("flex min-w-0 flex-1 items-center gap-2.5", !isDisabled && "cursor-grab")}
      >
        <GripVertical
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="truncate text-sm text-muted-foreground">
            {genderLabel(participant.gender)} ·{" "}
            {statusLabel(participant.status, participant.gender)}
          </span>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={isDisabled}
        aria-label={t("roomAssignments.assignAria", { name })}
        onClick={onAssign}
      >
        {t("roomAssignments.assign")}
      </Button>
    </li>
  )
}

type RoomProps = {
  room: AssignmentRoom
  /** Something is being dragged and this room has a free bed (and is not the dragged one's own). */
  isEligible: boolean
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
          roomId={room.id}
          scope={scope}
          isBlock={scope === "card"}
          onMove={() => onMoveParticipant(participant)}
          onRemove={() => onRemoveParticipant(participant)}
        />
      ))}
    </div>
  )
}

function ExtraBeds({ room }: { room: AssignmentRoom }) {
  const { t } = useTranslation("events")
  return room.extraBeds > 0 ? (
    <Badge variant="info">{t("roomAssignments.extraBeds", { count: room.extraBeds })}</Badge>
  ) : null
}

function Occupancy({ room, isDropping }: { room: AssignmentRoom; isDropping: boolean }) {
  const { t } = useTranslation("events")
  const { freeBedsLabel } = useAssignmentLabels()
  return (
    <div className="flex flex-col items-start gap-1 text-sm">
      <span className="font-medium">
        {room.participants.length} / {room.beds}
      </span>
      <span className={cn("font-medium", isDropping ? "text-link" : "text-muted-foreground")}>
        {isDropping ? t("roomAssignments.dropHere") : freeBedsLabel(room)}
      </span>
      <ExtraBeds room={room} />
    </div>
  )
}

/** Desktop row of a room: name with its gender, people as chips, occupancy and the room actions. */
export function RoomTableRow({
  room,
  isEligible,
  isDragActive,
  actions,
  onMoveParticipant,
  onRemoveParticipant,
}: RoomProps) {
  const { roomGenderLabel } = useAssignmentLabels()
  const { setNodeRef, isOver } = useDroppable({
    id: `row:${room.id}`,
    data: { roomId: room.id },
  })
  const isDropping = isEligible && isOver
  return (
    <TableRow
      ref={setNodeRef}
      className={cn(
        isDropping
          ? "bg-accent outline-2 -outline-offset-2 outline-ring"
          : isEligible && isDragActive && "bg-muted",
      )}
    >
      <TableCell
        aria-label={room.name}
        className="align-top whitespace-normal"
      >
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="font-bold">{room.name}</span>
          {room.gender ? <Badge variant="secondary">{roomGenderLabel(room.gender)}</Badge> : null}
        </div>
      </TableCell>
      <TableCell className="min-w-64 align-top whitespace-normal">
        <Chips
          room={room}
          scope="row"
          onMoveParticipant={onMoveParticipant}
          onRemoveParticipant={onRemoveParticipant}
        />
      </TableCell>
      <TableCell className="w-36 align-top">
        <Occupancy
          room={room}
          isDropping={isDropping}
        />
      </TableCell>
      <TableCell className="w-48 align-top">
        <div className="flex items-center justify-end gap-1">{actions}</div>
      </TableCell>
    </TableRow>
  )
}

/** Mobile card of a room: title, occupancy with a bar, the people stacked, then the room actions. */
export function RoomCard({
  room,
  isEligible,
  isDragActive,
  actions,
  onMoveParticipant,
  onRemoveParticipant,
}: RoomProps) {
  const { roomGenderLabel, freeBedsLabel } = useAssignmentLabels()
  const { setNodeRef, isOver } = useDroppable({
    id: `card:${room.id}`,
    data: { roomId: room.id },
  })
  const isDropping = isEligible && isOver
  const isFull = room.participants.length >= room.beds
  const share = Math.min(100, Math.round((room.participants.length / Math.max(1, room.beds)) * 100))
  return (
    <li
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card",
        isDropping
          ? "bg-accent outline-2 -outline-offset-2 outline-ring"
          : isEligible && isDragActive && "bg-muted",
      )}
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-center gap-2">
          <span className="font-semibold break-words">{room.name}</span>
          {room.gender ? <Badge variant="secondary">{roomGenderLabel(room.gender)}</Badge> : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold whitespace-nowrap">
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
          <Badge variant={isFull ? "secondary" : "success"}>{freeBedsLabel(room)}</Badge>
        </div>
        <ExtraBeds room={room} />
      </div>
      {room.participants.length ? (
        <div className="border-t border-border p-4">
          <Chips
            room={room}
            scope="card"
            onMoveParticipant={onMoveParticipant}
            onRemoveParticipant={onRemoveParticipant}
          />
        </div>
      ) : null}
      <div className="flex items-center gap-1 border-t border-border p-3">{actions}</div>
    </li>
  )
}
