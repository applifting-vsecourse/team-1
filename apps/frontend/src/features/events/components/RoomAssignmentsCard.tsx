import { useEffect, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import {
  roomAssignmentsQueryOptions,
  type AssignmentParticipant,
  type AssignmentRoom,
  type RoomWarning,
} from "@/features/events/api/room-assignments"
import { RoomCard, RoomTableRow } from "@/features/events/components/AssignmentParts"
import { participantName } from "@/features/events/components/room-assignment-labels"
import { useRoomAssignmentActions } from "@/features/events/components/RoomAssignmentActions"
import { RoomDndLayer, useRoomDnd } from "@/features/events/components/RoomDnd"
import { RoomWarningsSummary, warningsOfRoom } from "@/features/events/components/RoomWarnings"
import { CountBadge, UnassignedPanel } from "@/features/events/components/UnassignedPanel"

type Term = { eventId: string; termId: string; startsOn: string; endsOn: string }

/** True while the element is scrolled out of the viewport; where unsupported the bar stays hidden. */
function useScrolledOut(element: HTMLElement | null): boolean {
  const [isOut, setIsOut] = useState(false)
  useEffect(() => {
    if (!element || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(([entry]) =>
      setIsOut(entry ? !entry.isIntersecting && entry.boundingClientRect.bottom <= 0 : false),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])
  return isOut
}

// Who sleeps where in one term: the unassigned participants (confirmed and to evaluate) and the
// rooms with their people. A participant is dragged onto a room (mouse, or a long press on touch)
// or assigned through the "Assign" dialog; people in a room open a menu to move or remove them.
// Figma (Design system): Rozdělení do pokojů · přehled · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23441-97050 (mobile 23445-99644)
// Figma (Design system): Přetažení · tažení / cíl / upuštění a toast · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23441-97663 · 23441-98374 · 23441-99087 (mobile 23445-99874)
// Figma (Design system): Přiřazený účastník · nabídka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23444-99101 (mobile 23445-100202)
// Figma (Design system): Termín bez pokojů · bez potvrzených · všichni přiřazení · nerozděluje se · společné pokoje · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23444-100486
// Approved improvements over the frames (US-35 review): structured summary, separate name and
// gender columns, louder count, paged unassigned list, drag on touch, restructured dialog.
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
  const query = useQuery(roomAssignmentsQueryOptions(term.eventId, term.termId))
  const [placement, setPlacement] = useState<{ roomId: string; termId: string; sequence: number }>()
  const actions = useRoomAssignmentActions(term, (room) =>
    setPlacement((previous) => ({
      roomId: room.id,
      termId: term.termId,
      sequence: (previous?.sequence ?? 0) + 1,
    })),
  )
  const [search, setSearch] = useState("")
  // The panel renders only once the data is there, so it is tracked as state, not as a ref object.
  const [panel, setPanel] = useState<HTMLDivElement | null>(null)
  const isPanelScrolledOut = useScrolledOut(panel)
  const dnd = useRoomDnd(actions, query.data)
  const { removeFromRoom } = actions
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
  const regularRooms = data.rooms.filter((room) => !room.individual)
  const isNobodyAssigned = data.rooms.every((room) => room.participants.length === 0)
  const visibleRooms = data.rooms.filter((room) =>
    room.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  )
  const unassigned = data.unassigned
  const isAllDone = unassigned.length === 0 && !isNobodyAssigned

  const roomProps = (room: AssignmentRoom) => ({
    room,
    placementSequence:
      placement?.roomId === room.id && placement.termId === term.termId
        ? placement.sequence
        : undefined,
    isEligible: dnd.isEligible(room),
    warnings: warningsOfRoom(data.warnings, room.id),
    onAcknowledge: (warning: RoomWarning, target: AssignmentRoom) =>
      actions.acknowledge(warning, target),
    isDragActive: dnd.dragged !== null,
    actions: roomActions(room.id),
    onMoveParticipant: (participant: AssignmentParticipant) =>
      actions.openAssign(participant, room.id),
    onRemoveParticipant: (participant: AssignmentParticipant) =>
      removeFromRoom(participant.applicationTermId, participantName(participant)),
  })

  const roomsEmpty = (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border-strong p-10 text-center nested:border-border">
      <EmptyState message={t("rooms.empty")} />
      <Button
        size="lg"
        onClick={onAddRoom}
      >
        {t("rooms.add")}
      </Button>
    </div>
  )

  return (
    <RoomDndLayer dnd={dnd}>
      <div className="flex flex-col gap-4">
        <RoomWarningsSummary
          data={data}
          isSharedMode={
            // Individual rooms have no gender in either mode; with only those the mode is not shared.
            regularRooms.length > 0 && regularRooms.every((room) => room.gender === null)
          }
        />
        {/* On a phone the count of the unassigned stays under the top bar while the rooms scroll. */}
        {isPanelScrolledOut ? (
          <div
            role="status"
            aria-label={t("roomAssignments.unassignedTitle")}
            className="sticky top-29 z-10 -mx-4 flex items-center gap-2 border-b border-border bg-card px-4 py-2.5 md:top-19 xl:hidden"
          >
            <span className="flex-1 text-sm font-medium">
              {t("roomAssignments.unassignedTitle")}
            </span>
            <CountBadge
              count={unassigned.length}
              isAllDone={isAllDone}
            />
          </div>
        ) : null}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
          <UnassignedPanel
            panelRef={setPanel}
            unassigned={unassigned}
            isAllDone={isAllDone}
            isNobodyAssigned={isNobodyAssigned}
            hasRooms={hasRooms}
            isDragActive={dnd.dragged !== null && dnd.dragged.fromRoomId !== null}
            className="xl:sticky xl:top-20 xl:w-72"
            onAssign={(participant) => actions.openAssign(participant, null)}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {hasRooms ? (
              <>
                <div className="relative w-full lg:w-85">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    type="search"
                    aria-label={t("roomAssignments.searchLabel")}
                    placeholder={t("roomAssignments.searchPlaceholder")}
                    className="h-12.5 px-11 [&::-webkit-search-cancel-button]:hidden"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  {search && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1/2 right-0 size-11 -translate-y-1/2"
                      aria-label={t("roomAssignments.clearSearch")}
                      onClick={() => setSearch("")}
                    >
                      <X aria-hidden />
                    </Button>
                  )}
                </div>
                {visibleRooms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("roomAssignments.noMatch")}</p>
                ) : null}
                <div className="hidden overflow-hidden rounded-lg border border-border-strong lg:block nested:border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">{t("roomAssignments.roomColumn")}</TableHead>
                        <TableHead>{t("roomAssignments.participantsColumn")}</TableHead>
                        <TableHead>{t("roomAssignments.occupancyColumn")}</TableHead>
                        <TableHead className="w-px pr-4">
                          <span className="sr-only">{t("rooms.actionsColumn")}</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleRooms.map((room) => (
                        <RoomTableRow
                          key={room.id}
                          {...roomProps(room)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ul className="flex flex-col gap-3 lg:hidden">
                  {visibleRooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      {...roomProps(room)}
                    />
                  ))}
                </ul>
              </>
            ) : (
              roomsEmpty
            )}
          </div>
        </div>
        {actions.dialogs(data.rooms)}
      </div>
    </RoomDndLayer>
  )
}
