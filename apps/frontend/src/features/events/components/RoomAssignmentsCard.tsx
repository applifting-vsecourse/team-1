import { useEffect, useState, type ReactNode } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { useQuery } from "@tanstack/react-query"
import { Search, X } from "lucide-react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"

import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Pagination } from "@/components/molecules/Pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePagination } from "@/hooks/usePagination"

import {
  roomAssignmentsQueryOptions,
  type AssignmentParticipant,
  type AssignmentRoom,
  type RoomWarning,
} from "@/features/events/api/room-assignments"
import {
  ParticipantGhost,
  RoomCard,
  RoomTableRow,
  UnassignedDropZone,
  UnassignedRow,
  type DragData,
} from "@/features/events/components/AssignmentParts"
import { freeBedCount, participantName } from "@/features/events/components/room-assignment-labels"
import { useRoomAssignmentActions } from "@/features/events/components/RoomAssignmentActions"
import { RoomWarningsSummary, warningsOfRoom } from "@/features/events/components/RoomWarnings"

type Term = { eventId: string; termId: string; startsOn: string; endsOn: string }

/** The unassigned list is paged and searchable: a camp can have hundreds of people. */
const UNASSIGNED_PAGE_SIZE = 10

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

/** The count of the unassigned, a bit louder than a plain badge but never a warning. */
function CountBadge({ count, isAllDone }: { count: number; isAllDone: boolean }) {
  return (
    <Badge
      variant={isAllDone ? "success" : "default"}
      className="px-3 py-1 text-sm font-semibold"
    >
      {count}
    </Badge>
  )
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
  const [dragged, setDragged] = useState<DragData | null>(null)
  const [search, setSearch] = useState("")
  const [peopleSearch, setPeopleSearch] = useState("")
  // The panel renders only once the data is there, so it is tracked as state, not as a ref object.
  const [panel, setPanel] = useState<HTMLDivElement | null>(null)
  const isPanelScrolledOut = useScrolledOut(panel)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  )

  const { assign, notifyFailure, removeFromRoom, confirmPlacement } = actions
  const unassignedList = query.data?.unassigned ?? []
  const foundPeople = unassignedList.filter((participant) =>
    participantName(participant)
      .toLocaleLowerCase()
      .includes(peopleSearch.trim().toLocaleLowerCase()),
  )
  const paging = usePagination(foundPeople, peopleSearch, UNASSIGNED_PAGE_SIZE)

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
    assign.mutate(
      { applicationTermId: drag.applicationTermId, roomId: room.id },
      {
        onSuccess: () => confirmPlacement(room, drag.name, drag.fromRoomId !== null),
        onError: notifyFailure,
      },
    )
  }
  const onDragStart = (event: DragStartEvent) =>
    setDragged((event.active.data.current as DragData | undefined) ?? null)
  const onDragEnd = (event: DragEndEvent) => {
    const drag = event.active.data.current as DragData | undefined
    const over = event.over?.data.current as { roomId?: string; isUnassigned?: boolean } | undefined
    const roomId = over?.roomId
    setDragged(null)
    if (drag && over?.isUnassigned) {
      if (drag.fromRoomId !== null) removeFromRoom(drag.applicationTermId, drag.name)
      return
    }
    const room = data.rooms.find((item) => item.id === roomId)
    if (drag && room) dropOn(drag, room)
  }
  const roomProps = (room: AssignmentRoom) => ({
    room,
    placementSequence:
      placement?.roomId === room.id && placement.termId === term.termId
        ? placement.sequence
        : undefined,
    isEligible: isEligible(room),
    warnings: warningsOfRoom(data.warnings, room.id),
    onAcknowledge: (warning: RoomWarning, target: AssignmentRoom) =>
      actions.acknowledge(warning, target),
    isDragActive: dragged !== null,
    actions: roomActions(room.id),
    onMoveParticipant: (participant: AssignmentParticipant) =>
      actions.openAssign(participant, room.id),
    onRemoveParticipant: (participant: AssignmentParticipant) =>
      removeFromRoom(participant.applicationTermId, participantName(participant)),
  })

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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragged(null)}
    >
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
            className="sticky top-29 z-10 -mx-4 flex items-center gap-2 border-b border-border bg-card px-4 py-2.5 shadow-sm md:top-19 xl:hidden"
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
          <UnassignedDropZone
            panelRef={setPanel}
            isDragActive={dragged !== null && dragged.fromRoomId !== null}
            className="flex shrink-0 flex-col rounded-lg border border-border bg-card xl:sticky xl:top-20 xl:w-72"
          >
            <div className="flex flex-col gap-1 px-3 pt-3 pb-2.5">
              <div className="flex items-center gap-2">
                <h4 className="flex-1 text-sm font-semibold">
                  {t("roomAssignments.unassignedTitle")}
                </h4>
                <span
                  aria-label={t("roomAssignments.unassignedStatus", { count: unassigned.length })}
                >
                  <CountBadge
                    count={unassigned.length}
                    isAllDone={isAllDone}
                  />
                </span>
              </div>
              {unassigned.length > 0 && isNobodyAssigned && hasRooms ? (
                <p className="text-sm text-muted-foreground">{t("roomAssignments.optionalNote")}</p>
              ) : null}
            </div>
            {unassigned.length === 0 ? (
              <p className="border-t border-border px-3 pt-3 pb-4 text-sm text-muted-foreground">
                {t(
                  isNobodyAssigned ? "roomAssignments.noConfirmed" : "roomAssignments.allAssigned",
                )}
              </p>
            ) : (
              <>
                {unassigned.length > UNASSIGNED_PAGE_SIZE ? (
                  <div className="relative border-t border-border px-3 py-2">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-5.5 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      type="search"
                      aria-label={t("roomAssignments.searchPeopleLabel")}
                      placeholder={t("roomAssignments.searchPeoplePlaceholder")}
                      className="h-9 pl-9"
                      value={peopleSearch}
                      onChange={(event) => setPeopleSearch(event.target.value)}
                    />
                  </div>
                ) : null}
                {foundPeople.length === 0 ? (
                  <p className="border-t border-border px-3 pt-3 pb-4 text-sm text-muted-foreground">
                    {t("roomAssignments.noPersonMatch")}
                  </p>
                ) : null}
                <ul>
                  {paging.pageItems.map((participant, index) => (
                    <UnassignedRow
                      key={participant.applicationTermId}
                      participant={participant}
                      isFirst={index === 0}
                      isDisabled={!hasRooms}
                      onAssign={() => actions.openAssign(participant, null)}
                    />
                  ))}
                </ul>
                {paging.pageCount > 1 ? (
                  <div className="border-t border-border px-2 py-3">
                    <Pagination
                      isCompact
                      page={paging.page}
                      pageCount={paging.pageCount}
                      pageSize={paging.pageSize}
                      total={paging.total}
                      onPageChange={paging.setPage}
                    />
                  </div>
                ) : null}
              </>
            )}
          </UnassignedDropZone>
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
                <div className="hidden overflow-hidden rounded-lg border border-border lg:block">
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
      {/* In a portal: inside the card an ancestor offset the fixed overlay to a screen corner. */}
      {createPortal(
        <DragOverlay dropAnimation={null}>
          {dragged ? <ParticipantGhost name={dragged.name} /> : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  )
}
