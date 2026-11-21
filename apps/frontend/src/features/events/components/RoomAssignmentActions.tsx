import { useState, type ReactNode } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { notify } from "@/lib/notify"

import {
  assignRoom,
  unassignRoom,
  type AssignmentParticipant,
  type AssignmentRoom,
  type RoomWarning,
  type UnassignedParticipant,
} from "@/features/events/api/room-assignments"
import { AcknowledgeWarningDialog } from "@/features/events/components/AcknowledgeWarningDialog"
import { AssignRoomDialog, type AssignTarget } from "@/features/events/components/AssignRoomDialog"
import {
  ExtraBedConfirmDialog,
  type ExtraBedRequest,
} from "@/features/events/components/ExtraBedConfirmDialog"
import {
  participantName,
  useAssignmentLabels,
} from "@/features/events/components/room-assignment-labels"

type Term = { eventId: string; termId: string; startsOn: string; endsOn: string }

/**
 * #542: everything that changes who sleeps where, shared by the two views of the accommodation
 * (Rozřazování and Pokoje): the dialogs for assigning, moving, an extra bed and confirming a
 * warning, the mutations and the invalidation that refreshes both views at once.
 */
export function useRoomAssignmentActions(
  term: Term,
  /** Called after a person is placed in a room, e.g. to highlight the room in the assignment. */
  onPlaced?: (room: AssignmentRoom) => void,
) {
  const { t } = useTranslation("events")
  const { roomTitle } = useAssignmentLabels()
  const client = useQueryClient()
  const [dialog, setDialog] = useState<{ target: AssignTarget } | null>(null)
  const [extraBed, setExtraBed] = useState<ExtraBedRequest | null>(null)
  const [acknowledging, setAcknowledging] = useState<{
    warning: RoomWarning
    room: AssignmentRoom
  } | null>(null)

  // An assignment can change the capacity (beds of an individual room count by occupancy, US-145),
  // so the rooms, the capacity and the occupancy of the event are stale as well.
  const refresh = () => client.invalidateQueries({ queryKey: ["events", term.eventId] })
  const assign = useMutation({
    mutationFn: (input: { applicationTermId: string; roomId: string }) =>
      assignRoom(term.eventId, term.termId, input.applicationTermId, input.roomId),
  })
  const unassign = useMutation({
    mutationFn: (applicationTermId: string) =>
      unassignRoom(term.eventId, term.termId, applicationTermId),
  })
  /** The toast and the refresh after a person was placed or moved; the same in both views. */
  const confirmPlacement = (room: AssignmentRoom, name: string, isMove: boolean) => {
    onPlaced?.(room)
    notify.success(
      t(isMove ? "roomAssignments.moved" : "roomAssignments.assigned"),
      t("roomAssignments.assignedDescription", { name, room: roomTitle(room) }),
    )
    void refresh()
  }
  const notifyFailure = (error: Error) => notify.error(t("roomAssignments.failed"), error.message)

  const toTarget = (
    participant: AssignmentParticipant | UnassignedParticipant,
    currentRoomId: string | null,
  ): AssignTarget => ({
    applicationTermId: participant.applicationTermId,
    name: participantName(participant),
    firstName: participant.firstName,
    lastName: participant.lastName,
    gender: participant.gender,
    status: participant.status,
    currentRoomId,
    alsoInTerms: "alsoInTerms" in participant ? participant.alsoInTerms : [],
  })
  /** Opens the dialog to assign (no current room) or to move a participant. */
  const openAssign = (
    participant: AssignmentParticipant | UnassignedParticipant,
    currentRoomId: string | null,
  ) => setDialog({ target: toTarget(participant, currentRoomId) })
  const removeFromRoom = (applicationTermId: string, name: string) =>
    unassign.mutate(applicationTermId, {
      onSuccess: () => {
        void refresh().then(() => notify.success(t("roomAssignments.removed"), name))
      },
      onError: notifyFailure,
    })
  const acknowledge = (warning: RoomWarning, room: AssignmentRoom) =>
    setAcknowledging({ warning, room })

  const dialogs = (rooms: AssignmentRoom[]): ReactNode => (
    <>
      {dialog ? (
        <AssignRoomDialog
          key={dialog.target.applicationTermId}
          eventId={term.eventId}
          term={term}
          rooms={rooms}
          target={dialog.target}
          onClose={() => setDialog(null)}
          onNeedsExtraBed={(room, checkedTermIds) =>
            setExtraBed({
              applicationTermId: dialog.target.applicationTermId,
              name: dialog.target.name,
              isMove: dialog.target.currentRoomId !== null,
              room,
              alsoInTerms: dialog.target.currentRoomId === null ? dialog.target.alsoInTerms : [],
              checkedTermIds,
            })
          }
          onDone={({ room, isMoved }) => confirmPlacement(room, dialog.target.name, isMoved)}
        />
      ) : null}
      {extraBed ? (
        <ExtraBedConfirmDialog
          key={extraBed.applicationTermId}
          eventId={term.eventId}
          term={term}
          request={extraBed}
          onClose={() => setExtraBed(null)}
          onDone={({ room, isMoved }) => confirmPlacement(room, extraBed.name, isMoved)}
        />
      ) : null}
      {acknowledging ? (
        <AcknowledgeWarningDialog
          eventId={term.eventId}
          termId={term.termId}
          warning={acknowledging.warning}
          room={acknowledging.room}
          onClose={() => setAcknowledging(null)}
          onDone={async () => {
            await refresh()
            notify.success(t("acknowledgeDialog.done"))
          }}
        />
      ) : null}
    </>
  )

  return {
    assign,
    refresh,
    confirmPlacement,
    notifyFailure,
    openAssign,
    openExtraBed: setExtraBed,
    removeFromRoom,
    acknowledge,
    dialogs,
  }
}
