import { useState, type ReactNode } from "react"
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { createPortal } from "react-dom"

import type { AssignmentRoom, RoomAssignments } from "@/features/events/api/room-assignments"
import { ParticipantGhost, type DragData } from "@/features/events/components/AssignmentParts"
import { freeBedCount } from "@/features/events/components/room-assignment-labels"
import type { useRoomAssignmentActions } from "@/features/events/components/RoomAssignmentActions"

/**
 * #542: dragging a person onto a room (or out of one onto the unassigned) is the same in both
 * views of the accommodation: mouse, or a long press on touch. A full room asks for an extra bed.
 */
export function useRoomDnd(
  actions: ReturnType<typeof useRoomAssignmentActions>,
  data: RoomAssignments | undefined,
) {
  const [dragged, setDragged] = useState<DragData | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  )
  // A full room is a target too: the organizer confirms an extra bed for the one dropped on it.
  const isEligible = (room: AssignmentRoom) => dragged !== null && dragged.fromRoomId !== room.id
  const dropOn = (drag: DragData, room: AssignmentRoom) => {
    if (drag.fromRoomId === room.id) return
    if (freeBedCount(room) === 0) {
      actions.openExtraBed({
        applicationTermId: drag.applicationTermId,
        name: drag.name,
        isMove: drag.fromRoomId !== null,
        room,
        // Only an unassigned participant is placed in their other terms too; a move stays here.
        alsoInTerms:
          drag.fromRoomId === null
            ? (data?.unassigned.find((row) => row.applicationTermId === drag.applicationTermId)
                ?.alsoInTerms ?? [])
            : [],
      })
      return
    }
    actions.assign.mutate(
      { applicationTermId: drag.applicationTermId, roomId: room.id },
      {
        onSuccess: () => actions.confirmPlacement(room, drag.name, drag.fromRoomId !== null),
        onError: actions.notifyFailure,
      },
    )
  }
  const onDragStart = (event: DragStartEvent) =>
    setDragged((event.active.data.current as DragData | undefined) ?? null)
  const onDragEnd = (event: DragEndEvent) => {
    const drag = event.active.data.current as DragData | undefined
    const over = event.over?.data.current as { roomId?: string; isUnassigned?: boolean } | undefined
    setDragged(null)
    if (drag && over?.isUnassigned) {
      if (drag.fromRoomId !== null) actions.removeFromRoom(drag.applicationTermId, drag.name)
      return
    }
    const room = data?.rooms.find((item) => item.id === over?.roomId)
    if (drag && room) dropOn(drag, room)
  }
  return {
    dragged,
    isEligible,
    sensors,
    onDragStart,
    onDragEnd,
    onDragCancel: () => setDragged(null),
  }
}

export type RoomDnd = ReturnType<typeof useRoomDnd>

/** The drag and drop context of a view with the ghost that follows the pointer. */
export function RoomDndLayer({ dnd, children }: { dnd: RoomDnd; children: ReactNode }) {
  return (
    <DndContext
      sensors={dnd.sensors}
      collisionDetection={pointerWithin}
      onDragStart={dnd.onDragStart}
      onDragEnd={dnd.onDragEnd}
      onDragCancel={dnd.onDragCancel}
    >
      {children}
      {/* In a portal: inside the card an ancestor offset the fixed overlay to a screen corner. */}
      {createPortal(
        <DragOverlay dropAnimation={null}>
          {dnd.dragged ? <ParticipantGhost name={dnd.dragged.name} /> : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  )
}
