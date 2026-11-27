import { useState } from "react"
import { Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Pagination } from "@/components/molecules/Pagination"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { usePagination } from "@/hooks/usePagination"
import { cn } from "@/lib/utils"

import type { UnassignedParticipant } from "@/features/events/api/room-assignments"
import { UnassignedDropZone, UnassignedRow } from "@/features/events/components/AssignmentParts"
import { participantName } from "@/features/events/components/room-assignment-labels"

/** The unassigned list is paged and searchable: a camp can have hundreds of people. */
export const UNASSIGNED_PAGE_SIZE = 10

/** The count of the unassigned, a bit louder than a plain badge but never a warning. */
export function CountBadge({ count, isAllDone }: { count: number; isAllDone: boolean }) {
  return (
    <Badge
      variant={isAllDone ? "success" : "default"}
      className="px-3 py-1 text-sm font-semibold"
    >
      {count}
    </Badge>
  )
}

/**
 * The panel of the participants without a room (confirmed and to evaluate): search, rows to drag or
 * assign through the dialog, and a drop target that removes a person from their room. In the
 * assignment it is the narrow column on the left (paged); in the Pokoje view (#542) it is a full
 * width section with all the names.
 */
export function UnassignedPanel({
  unassigned,
  isAllDone,
  isNobodyAssigned,
  hasRooms,
  isDragActive,
  isFullWidth = false,
  panelRef = () => undefined,
  onAssign,
  className,
}: {
  unassigned: UnassignedParticipant[]
  isAllDone: boolean
  isNobodyAssigned: boolean
  hasRooms: boolean
  /** A person sitting in a room is being dragged, so the panel is a valid target. */
  isDragActive: boolean
  isFullWidth?: boolean
  panelRef?: (element: HTMLDivElement | null) => void
  onAssign: (participant: UnassignedParticipant) => void
  className?: string
}) {
  const { t } = useTranslation("events")
  const [search, setSearch] = useState("")
  const found = unassigned.filter((participant) =>
    participantName(participant).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  )
  const paging = usePagination(found, search, UNASSIGNED_PAGE_SIZE)
  const rows = isFullWidth ? found : paging.pageItems
  return (
    <UnassignedDropZone
      panelRef={panelRef}
      isDragActive={isDragActive}
      className={cn(
        "flex shrink-0 flex-col rounded-lg border border-border-strong bg-card nested:border-border",
        className,
      )}
    >
      <div className="flex flex-col gap-1 px-3 pt-3 pb-2.5">
        <div className="flex items-center gap-2">
          <h4 className="flex-1 text-sm font-semibold">{t("roomAssignments.unassignedTitle")}</h4>
          <span aria-label={t("roomAssignments.unassignedStatus", { count: unassigned.length })}>
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
          {t(isNobodyAssigned ? "roomAssignments.noConfirmed" : "roomAssignments.allAssigned")}
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
                className="h-9 pl-9 sm:max-w-80"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          ) : null}
          {found.length === 0 ? (
            <p className="border-t border-border px-3 pt-3 pb-4 text-sm text-muted-foreground">
              {t("roomAssignments.noPersonMatch")}
            </p>
          ) : null}
          <ul
            className={cn(
              // Narrow list: the search row has its own bottom edge when it is shown.
              !isFullWidth && unassigned.length > UNASSIGNED_PAGE_SIZE && "border-t border-border",
              // Full width: every row draws its own top edge, so a grid of columns has one line.
              isFullWidth &&
                "grid sm:grid-cols-2 lg:grid-cols-3 [&>li]:border-t [&>li]:border-border",
            )}
          >
            {rows.map((participant, index) => (
              <UnassignedRow
                key={participant.applicationTermId}
                participant={participant}
                isFirst={isFullWidth || index === 0}
                isDisabled={!hasRooms}
                onAssign={() => onAssign(participant)}
              />
            ))}
          </ul>
          {!isFullWidth && paging.pageCount > 1 ? (
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
  )
}
