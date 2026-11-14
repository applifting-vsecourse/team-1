import { useEffect, useState, type DragEvent, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { notify } from "@/lib/notify"

import {
  assignRoom,
  roomAssignmentsKey,
  roomAssignmentsQueryOptions,
  unassignRoom,
  type AssignmentParticipant,
  type AssignmentRoom,
  type UnassignedParticipant,
} from "@/features/events/api/room-assignments"
import {
  RoomCard,
  RoomTableRow,
  UnassignedRow,
  type DragState,
} from "@/features/events/components/AssignmentParts"
import { AssignRoomDialog, type AssignTarget } from "@/features/events/components/AssignRoomDialog"
import {
  freeBedCount,
  participantName,
  useAssignmentLabels,
} from "@/features/events/components/room-assignment-labels"

type Term = { eventId: string; termId: string; startsOn: string; endsOn: string }

/** True while the element is scrolled out of the viewport; where unsupported the bar stays hidden. */
function useScrolledOut(element: HTMLElement | null): boolean {
  const [isOut, setIsOut] = useState(false)
  useEffect(() => {
    if (!element || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(([entry]) =>
      setIsOut(entry ? !entry.isIntersecting : false),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])
  return isOut
}

// Who sleeps where in one term: the unassigned participants (confirmed and to evaluate) and the
// rooms with their people. Desktop drags a participant onto a room row, every device assigns
// through the "Assign" dialog; people in a room open a menu to move or remove them.
// Figma (Design system): Rozdělení do pokojů · přehled · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23441-97050 (mobile 23445-99644)
// Figma (Design system): Přetažení · tažení / cíl / upuštění a toast · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23441-97663 · 23441-98374 · 23441-99087 (mobile 23445-99874)
// Figma (Design system): Přiřazený účastník · nabídka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23444-99101 (mobile 23445-100202)
// Figma (Design system): Termín bez pokojů · bez potvrzených · všichni přiřazení · nerozděluje se · společné pokoje · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23444-100486
export function RoomAssignmentsCard({
  term,
  roomActions,
  onAddRoom,
}: {
  term: Term
  /** Edit / delete / extra-bed buttons of one room, owned by the rooms page. */
  roomActions: (roomId: string) => ReactNode
  onAddRoom: () => void
}) {
  const { t } = useTranslation("events")
  const client = useQueryClient()
  const { roomTitle } = useAssignmentLabels()
  const query = useQuery(roomAssignmentsQueryOptions(term.eventId, term.termId))
  const [dialog, setDialog] = useState<{ target: AssignTarget; roomId?: string } | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [overRoomId, setOverRoomId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  // The panel renders only once the data is there, so it is tracked as state, not as a ref object.
  const [panel, setPanel] = useState<HTMLDivElement | null>(null)
  const isPanelScrolledOut = useScrolledOut(panel)

  const refresh = () =>
    client.invalidateQueries({ queryKey: roomAssignmentsKey(term.eventId, term.termId) })
  const assign = useMutation({
    mutationFn: (input: { applicationTermId: string; roomId: string }) =>
      assignRoom(term.eventId, term.termId, input.applicationTermId, input.roomId),
  })
  const unassign = useMutation({
    mutationFn: (applicationTermId: string) =>
      unassignRoom(term.eventId, term.termId, applicationTermId),
  })

  const data = query.data
  if (!data) {
    return query.isError ? (
      <ErrorState
        title={t("roomAssignments.loadFailed")}
        error={query.error}
        onRetry={() => {
          void query.refetch()
        }}
      />
    ) : (
      <LoadingState />
    )
  }

  const hasRooms = data.rooms.length > 0
  const isNobodyAssigned = data.rooms.every((room) => room.participants.length === 0)
  const totalBeds = data.rooms.reduce((sum, room) => sum + room.beds, 0)
  const visibleRooms = data.rooms.filter((room) =>
    roomTitle(room).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  )

  const toTarget = (
    participant: AssignmentParticipant | UnassignedParticipant,
    currentRoomId: string | null,
  ): AssignTarget => ({
    applicationTermId: participant.applicationTermId,
    name: participantName(participant),
    gender: participant.gender,
    status: participant.status,
    currentRoomId,
    alsoInTerms: "alsoInTerms" in participant ? participant.alsoInTerms : [],
  })
  const notifyFailure = (error: Error) => notify.error(t("roomAssignments.failed"), error.message)
  const dropOn = (room: AssignmentRoom) => {
    const dragged = drag
    setDrag(null)
    setOverRoomId(null)
    if (!dragged || dragged.fromRoomId === room.id || freeBedCount(room) === 0) return
    assign.mutate(
      { applicationTermId: dragged.applicationTermId, roomId: room.id },
      {
        onSuccess: () => {
          void refresh().then(() =>
            notify.success(
              t(dragged.fromRoomId ? "roomAssignments.moved" : "roomAssignments.assigned"),
              t("roomAssignments.assignedDescription", {
                name: dragged.name,
                room: roomTitle(room),
              }),
            ),
          )
        },
        onError: notifyFailure,
      },
    )
  }
  const remove = (participant: AssignmentParticipant) =>
    unassign.mutate(participant.applicationTermId, {
      onSuccess: () => {
        void refresh().then(() =>
          notify.success(t("roomAssignments.removed"), participantName(participant)),
        )
      },
      onError: notifyFailure,
    })
  const canDrop = (room: AssignmentRoom) =>
    drag !== null && drag.fromRoomId !== room.id && freeBedCount(room) > 0
  const rowDrag = (room: AssignmentRoom) => ({
    onDragOver: (event: DragEvent) => {
      if (!canDrop(room)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = "move"
      setOverRoomId(room.id)
    },
    onDragLeave: () => setOverRoomId((id) => (id === room.id ? null : id)),
    onDrop: (event: DragEvent) => {
      event.preventDefault()
      dropOn(room)
    },
  })
  const endDrag = () => {
    setDrag(null)
    setOverRoomId(null)
  }
  const dragProps = { onDragStart: setDrag, onDragEnd: endDrag }
  const roomsEmpty = (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border p-10 text-center">
      <EmptyState message={t("rooms.empty")} />
      <Button
        size="lg"
        onClick={onAddRoom}
      >
        {t("rooms.add")}
      </Button>
    </div>
  )
  const unassigned = data.unassigned

  return (
    <div className="flex flex-col gap-4">
      <p>
        {t("roomAssignments.summary", {
          rooms: t("rooms.roomCount", { count: data.rooms.length }),
          beds: t("roomAssignments.beds", { count: totalBeds }),
        })}
      </p>
      {hasRooms ? (
        <p className="text-sm text-muted-foreground">{t("roomAssignments.hint")}</p>
      ) : null}
      {/* On a phone the count of the unassigned stays under the top bar while the rooms scroll. */}
      {isPanelScrolledOut ? (
        <div
          role="status"
          className="sticky top-14 z-20 -mx-4 flex items-center gap-2 border-b border-border bg-card px-4 py-2.5 shadow-sm md:hidden"
        >
          <span className="flex-1 text-sm font-medium">{t("roomAssignments.unassignedTitle")}</span>
          <Badge variant={unassigned.length === 0 && !isNobodyAssigned ? "success" : "secondary"}>
            {unassigned.length}
          </Badge>
        </div>
      ) : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div
          ref={setPanel}
          className="flex shrink-0 flex-col rounded-lg border border-border bg-card md:sticky md:top-20 md:w-85"
        >
          <div className="flex flex-col gap-1 px-3 pt-3 pb-2.5">
            <div className="flex items-center gap-2">
              <h4 className="flex-1 text-sm font-medium">{t("roomAssignments.unassignedTitle")}</h4>
              <Badge
                variant={unassigned.length === 0 && !isNobodyAssigned ? "success" : "secondary"}
                aria-label={t("roomAssignments.unassignedStatus", { count: unassigned.length })}
              >
                {unassigned.length}
              </Badge>
            </div>
            {unassigned.length > 0 && isNobodyAssigned && hasRooms ? (
              <p className="text-sm text-muted-foreground">{t("roomAssignments.optionalNote")}</p>
            ) : null}
          </div>
          {unassigned.length === 0 ? (
            <p className="border-t border-border px-3 pt-3 pb-4 text-sm text-muted-foreground">
              {t(isNobodyAssigned ? "roomAssignments.noConfirmed" : "roomAssignments.allAssigned")}
            </p>
          ) : (
            <ul>
              {unassigned.map((participant, index) => (
                <UnassignedRow
                  key={participant.applicationTermId}
                  participant={participant}
                  isFirst={index === 0}
                  isDisabled={!hasRooms}
                  isDragging={drag?.applicationTermId === participant.applicationTermId}
                  onAssign={() => setDialog({ target: toTarget(participant, null) })}
                  {...dragProps}
                />
              ))}
            </ul>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {hasRooms ? (
            <>
              <div className="relative hidden md:block md:w-85">
                <Search
                  className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  type="search"
                  aria-label={t("roomAssignments.searchLabel")}
                  placeholder={t("roomAssignments.searchPlaceholder")}
                  className="pl-11"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              {visibleRooms.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("roomAssignments.noMatch")}</p>
              ) : null}
              <div className="hidden overflow-hidden rounded-lg border border-border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("roomAssignments.roomColumn")}</TableHead>
                      <TableHead>{t("roomAssignments.occupancyColumn")}</TableHead>
                      <TableHead>{t("rooms.actionsColumn")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRooms.map((room) => (
                      <RoomTableRow
                        key={room.id}
                        room={room}
                        drag={drag}
                        drop={{ eligible: canDrop(room), over: overRoomId === room.id }}
                        actions={roomActions(room.id)}
                        onMoveParticipant={(participant) =>
                          setDialog({ target: toTarget(participant, room.id) })
                        }
                        onRemoveParticipant={remove}
                        {...rowDrag(room)}
                        {...dragProps}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="flex flex-col gap-3 md:hidden">
                {data.rooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    actions={roomActions(room.id)}
                    onMoveParticipant={(participant) =>
                      setDialog({ target: toTarget(participant, room.id) })
                    }
                    onRemoveParticipant={remove}
                  />
                ))}
              </ul>
            </>
          ) : (
            roomsEmpty
          )}
        </div>
      </div>
      {dialog ? (
        <AssignRoomDialog
          key={dialog.target.applicationTermId}
          eventId={term.eventId}
          term={term}
          rooms={data.rooms}
          target={dialog.target}
          initialRoomId={dialog.roomId}
          onClose={() => setDialog(null)}
          onDone={async ({ roomTitle: title, isMoved }) => {
            await refresh()
            notify.success(
              t(isMoved ? "roomAssignments.moved" : "roomAssignments.assigned"),
              t("roomAssignments.assignedDescription", {
                name: dialog.target.name,
                room: title,
              }),
            )
          }}
        />
      ) : null}
    </div>
  )
}
