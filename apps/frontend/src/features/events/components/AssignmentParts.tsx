import { useRef, useState, type DragEvent, type ReactNode } from "react"
import { GripVertical } from "lucide-react"
import { useTranslation } from "react-i18next"

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
export type DragState = { applicationTermId: string; name: string; fromRoomId: string | null }

type DragHandlers = {
  onDragStart: (drag: DragState) => void
  onDragEnd: () => void
}

/** A participant sitting in a room; click opens the actions (move, remove), desktop also drags it. */
export function ParticipantChip({
  participant,
  roomId,
  isDraggable,
  isDragging,
  onMove,
  onRemove,
  onDragStart,
  onDragEnd,
}: {
  participant: AssignmentParticipant
  roomId: string
  isDraggable: boolean
  isDragging: boolean
  onMove: () => void
  onRemove: () => void
} & DragHandlers) {
  const { t } = useTranslation("events")
  const name = participantName(participant)
  // The chip is a plain draggable button that opens the menu on click. Radix' own trigger opens
  // on pointer down and cancels the default of it, which would swallow a drag; so the trigger is
  // only an invisible anchor over the chip.
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <span className="relative inline-flex">
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((isShown) => !isShown)}
          draggable={isDraggable}
          aria-label={t("roomAssignments.participantMenu", { name })}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move"
            event.dataTransfer.setData("text/plain", participant.applicationTermId)
            onDragStart({
              applicationTermId: participant.applicationTermId,
              name,
              fromRoomId: roomId,
            })
          }}
          onDragEnd={onDragEnd}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-secondary px-2 py-1 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            isDraggable && "cursor-grab",
            isDragging && "opacity-50",
          )}
        >
          {isDraggable ? (
            <GripVertical
              className="size-3 text-muted-foreground"
              aria-hidden
            />
          ) : null}
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
  isDragging,
  onAssign,
  onDragStart,
  onDragEnd,
}: {
  participant: UnassignedParticipant
  isFirst: boolean
  isDisabled: boolean
  isDragging: boolean
  onAssign: () => void
} & DragHandlers) {
  const { t } = useTranslation("events")
  const { genderLabel, statusLabel } = useAssignmentLabels()
  const name = participantName(participant)
  return (
    <li
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5",
        !isFirst && "border-t border-border",
        isDragging && "opacity-50",
      )}
    >
      <div
        draggable={!isDisabled}
        onDragStart={(event: DragEvent) => {
          event.dataTransfer.effectAllowed = "move"
          event.dataTransfer.setData("text/plain", participant.applicationTermId)
          onDragStart({
            applicationTermId: participant.applicationTermId,
            name,
            fromRoomId: null,
          })
        }}
        onDragEnd={onDragEnd}
        className={cn("flex min-w-0 flex-1 items-center gap-2.5", !isDisabled && "md:cursor-grab")}
      >
        <GripVertical
          className="hidden size-3.5 shrink-0 text-muted-foreground md:block"
          aria-hidden
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="truncate text-sm text-muted-foreground">
            {genderLabel(participant.gender)} · {statusLabel(participant.status)}
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

/** Drop target state of a room while something is dragged. */
export type RoomDrop = { eligible: boolean; over: boolean }

function Occupancy({ room, isDropping }: { room: AssignmentRoom; isDropping: boolean }) {
  const { t } = useTranslation("events")
  const { freeBedsLabel } = useAssignmentLabels()
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span>
        {room.participants.length} / {room.beds}
      </span>
      <span className={cn("font-semibold", isDropping ? "text-link" : "text-muted-foreground")}>
        {isDropping ? t("roomAssignments.dropHere") : freeBedsLabel(room)}
      </span>
    </div>
  )
}

type RoomRowProps = {
  room: AssignmentRoom
  drop: RoomDrop
  drag: DragState | null
  actions: ReactNode
  onMoveParticipant: (participant: AssignmentParticipant) => void
  onRemoveParticipant: (participant: AssignmentParticipant) => void
  onDragOver: (event: DragEvent) => void
  onDragLeave: () => void
  onDrop: (event: DragEvent) => void
} & DragHandlers

/** Desktop row of a room (md and up): title, participants as chips, occupancy and the room actions. */
export function RoomTableRow({
  room,
  drop,
  drag,
  actions,
  onMoveParticipant,
  onRemoveParticipant,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
}: RoomRowProps) {
  const { roomTitle } = useAssignmentLabels()
  return (
    <TableRow
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        drop.over
          ? "bg-accent outline-2 -outline-offset-2 outline-ring"
          : drop.eligible && "bg-muted",
      )}
    >
      <TableCell
        aria-label={room.name}
        className="align-top whitespace-normal"
      >
        <div className="flex flex-col gap-1.5">
          <span className="font-bold break-words">{roomTitle(room)}</span>
          {room.participants.length || drop.over ? (
            <div className="flex flex-wrap gap-1.5">
              {room.participants.map((participant) => (
                <ParticipantChip
                  key={participant.applicationTermId}
                  participant={participant}
                  roomId={room.id}
                  isDraggable
                  isDragging={drag?.applicationTermId === participant.applicationTermId}
                  onMove={() => onMoveParticipant(participant)}
                  onRemove={() => onRemoveParticipant(participant)}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              ))}
              {drop.over && drag ? (
                <span className="inline-flex min-h-9 items-center rounded-lg border border-dashed border-primary bg-secondary px-2 py-1 text-sm">
                  {drag.name}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="w-32 align-top">
        <Occupancy
          room={room}
          isDropping={drop.over}
        />
      </TableCell>
      <TableCell className="w-48 align-top">
        <div className="flex items-center justify-end gap-1">{actions}</div>
      </TableCell>
    </TableRow>
  )
}

/** Mobile card of a room (below md): the same content, no dragging — people are assigned in the dialog. */
export function RoomCard({
  room,
  actions,
  onMoveParticipant,
  onRemoveParticipant,
}: Pick<RoomRowProps, "room" | "actions" | "onMoveParticipant" | "onRemoveParticipant">) {
  const { roomTitle, freeBedsLabel } = useAssignmentLabels()
  return (
    <li className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold break-words">{roomTitle(room)}</span>
        <span className="shrink-0 text-sm text-muted-foreground">
          {room.participants.length} / {room.beds}
        </span>
      </div>
      {room.participants.length ? (
        <div className="flex flex-wrap gap-1.5">
          {room.participants.map((participant) => (
            <ParticipantChip
              key={participant.applicationTermId}
              participant={participant}
              roomId={room.id}
              isDraggable={false}
              isDragging={false}
              onMove={() => onMoveParticipant(participant)}
              onRemove={() => onRemoveParticipant(participant)}
              onDragStart={() => undefined}
              onDragEnd={() => undefined}
            />
          ))}
        </div>
      ) : null}
      <span className="text-sm text-muted-foreground">{freeBedsLabel(room)}</span>
      <div className="flex flex-wrap items-center gap-1">{actions}</div>
    </li>
  )
}
