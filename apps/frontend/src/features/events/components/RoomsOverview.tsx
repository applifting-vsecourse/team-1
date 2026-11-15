import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/date"
import { termDatesLine } from "@/lib/term-label"
import { cn } from "@/lib/utils"

import {
  roomAssignmentsQueryOptions,
  type AssignmentRoom,
  type RoomWarning,
} from "@/features/events/api/room-assignments"
import type { TermRooms } from "@/features/events/api/rooms"
import {
  participantName,
  useAssignmentLabels,
} from "@/features/events/components/room-assignment-labels"
import {
  confirmedWithoutRoom,
  overviewBeds,
  overviewTotals,
  type OverviewBed,
} from "@/features/events/components/room-overview"

// Who sleeps where in one term, read-only, printable on A4: the rooms with their beds (people with
// the year of birth, free beds, extra beds) and the confirmed people still without a room.
// Individual accommodation (US-38) is deliberately not read here (D-161); no warnings of US-37 are
// listed, only a link back to the assignment where they are handled.
// Figma (Design system): #36 / Přehled ubytování · výchozí · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=25786-111072 (mobile 25786-111467, print A4 25788-112117 · 25788-112336)
// Figma (Design system): #36 / s odkazem na varování · bez přiřazení · plně obsazený · společné pokoje · přistýlka · bez pokojů · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=25786-111071
export function RoomsOverview({
  term,
  termSelect,
  onShowAssignment,
}: {
  term: TermRooms
  /** The term picker of the rooms page, shown first in the toolbar. */
  termSelect: ReactNode
  /** Back to the room assignment (US-35). */
  onShowAssignment: () => void
}) {
  const { t } = useTranslation("events")
  const query = useQuery(roomAssignmentsQueryOptions(term.eventId, term.termId))
  const data = query.data
  if (!data) {
    return query.isError ? (
      <ErrorState
        title={t("rooms.loadFailed")}
        error={query.error}
        onRetry={() => {
          void query.refetch()
        }}
      />
    ) : (
      <LoadingState />
    )
  }
  const totals = overviewTotals(data.rooms)
  const extraBeds = data.rooms.reduce((sum, room) => sum + room.extraBeds, 0)
  const withoutRoom = confirmedWithoutRoom(data.unassigned)
  const openWarnings = data.warnings.filter((warning: RoomWarning) => !warning.acknowledged).length
  const hasRooms = data.rooms.length > 0
  const metrics = [
    { label: t("roomOverview.rooms"), value: totals.rooms, helper: null },
    {
      label: t("roomOverview.beds"),
      value: totals.beds,
      helper: extraBeds > 0 ? t("roomOverview.includingExtra", { count: extraBeds }) : null,
    },
    { label: t("roomOverview.occupied"), value: totals.occupied, helper: null },
    { label: t("roomOverview.free"), value: totals.free, helper: null },
  ]

  return (
    <section
      className="flex flex-col gap-6 print:text-black"
      data-print-area
    >
      <div className="hidden items-end justify-between gap-4 border-b-2 border-black pb-3 print:flex">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-black">{term.eventName}</h2>
          <p className="text-sm text-black">
            {t("roomOverview.printTitle", {
              term: termDatesLine({ ...term, name: term.termName }),
            })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right text-xs text-black/70">
          <p>{t("roomOverview.printed", { date: formatDate(new Date()) })}</p>
          <p>
            {[
              t("roomOverview.printRooms", { count: totals.rooms }),
              t("roomOverview.printBeds", { count: totals.beds }),
              t("roomOverview.printOccupied", { count: totals.occupied }),
              t("roomOverview.printFree", { count: totals.free }),
            ].join(" · ")}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4 print:hidden">
        {termSelect}
        <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:items-center">
          <Button
            variant="ghost"
            size="lg"
            className="max-sm:w-full"
            onClick={onShowAssignment}
          >
            {t("roomOverview.editAssignment")}
          </Button>
          <Button
            size="lg"
            className="max-sm:w-full"
            disabled={!hasRooms}
            onClick={() => window.print()}
          >
            {t("roomOverview.print")}
          </Button>
        </div>
      </div>
      {hasRooms ? (
        <>
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4 print:hidden">
            {metrics.map((metric) => (
              <Card
                key={metric.label}
                className="gap-1 px-4 py-4"
              >
                <dt className="text-sm text-muted-foreground">{metric.label}</dt>
                <dd className="text-2xl font-semibold tracking-tight">{metric.value}</dd>
                {metric.helper ? (
                  <dd className="text-xs text-muted-foreground">{metric.helper}</dd>
                ) : null}
              </Card>
            ))}
          </dl>
          {openWarnings > 0 ? (
            <div className="flex flex-col gap-2 rounded-lg border border-status-warning/30 bg-status-warning-bg px-4 py-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
              <p>{t("roomOverview.warnings", { count: openWarnings })}</p>
              <Button
                variant="ghost"
                className="max-sm:self-center"
                onClick={onShowAssignment}
              >
                {t("roomOverview.showWarnings")}
              </Button>
            </div>
          ) : null}
          <ul className="grid items-start gap-4 md:grid-cols-2 print:block print:columns-2 print:gap-4">
            {data.rooms.map((room) => (
              <li
                key={room.id}
                className="print:mb-4 print:break-inside-avoid"
              >
                <RoomOverviewCard room={room} />
              </li>
            ))}
          </ul>
          {withoutRoom.length > 0 ? (
            <Card className="gap-0 overflow-hidden py-0 print:break-inside-avoid print:overflow-visible print:rounded-none print:border-black print:shadow-none">
              <div className="flex items-center gap-2 border-b px-4 py-3 print:border-black">
                <h3 className="font-semibold">{t("roomOverview.unassignedTitle")}</h3>
                <Badge
                  variant="secondary"
                  className="print:hidden"
                >
                  {withoutRoom.length}
                </Badge>
                <span className="hidden font-semibold print:inline">· {withoutRoom.length}</span>
              </div>
              <ul>
                {withoutRoom.map((person) => (
                  <li
                    key={person.applicationTermId}
                    className="flex items-baseline justify-between gap-2 border-b px-4 py-2 last:border-b-0 print:border-black/30"
                  >
                    <span className="min-w-0 break-words">{participantName(person)}</span>
                    <BirthYear year={person.birthYear} />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      ) : (
        <Card className="gap-3 p-6 print:hidden">
          <h3 className="text-lg font-semibold">{t("roomOverview.emptyTitle")}</h3>
          <p className="text-muted-foreground">{t("roomOverview.emptyBody")}</p>
          <Button
            variant="outline"
            size="lg"
            className="self-start max-sm:w-full"
            onClick={onShowAssignment}
          >
            {t("roomOverview.emptyAction")}
          </Button>
        </Card>
      )}
    </section>
  )
}

function RoomOverviewCard({ room }: { room: AssignmentRoom }) {
  const { t } = useTranslation("events")
  const { roomGenderLabel, freeBedsLabel } = useAssignmentLabels()
  return (
    <Card className="gap-0 overflow-hidden py-0 print:overflow-visible print:rounded-none print:border-black print:shadow-none">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3 print:border-black">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="font-semibold break-words">{room.name}</h3>
          <Badge
            variant="secondary"
            className="print:border-0 print:bg-transparent print:p-0 print:font-normal print:text-black/70 print:lowercase"
          >
            {room.gender ? roomGenderLabel(room.gender) : t("roomOverview.shared")}
          </Badge>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          <span className="text-sm font-medium print:font-semibold">
            {room.participants.length} / {room.beds}
            {room.extraBeds > 0 ? (
              <span className="hidden print:inline">
                {" · "}
                {t("roomOverview.printExtraBeds", { count: room.extraBeds })}
              </span>
            ) : null}
          </span>
          <span className="text-sm text-muted-foreground print:hidden">{freeBedsLabel(room)}</span>
          {room.extraBeds > 0 ? (
            <Badge
              variant="warning"
              className="print:hidden"
            >
              {t("roomAssignments.extraBeds", { count: room.extraBeds })}
            </Badge>
          ) : null}
        </div>
      </div>
      <ul>
        {overviewBeds(room).map((bed, index) => (
          <BedRow
            key={bed.kind === "taken" ? bed.participant.applicationTermId : `free-${index}`}
            bed={bed}
          />
        ))}
      </ul>
    </Card>
  )
}

function BedRow({ bed }: { bed: OverviewBed }) {
  const { t } = useTranslation("events")
  const rowClass =
    "flex items-center gap-3 border-b px-4 py-3 last:border-b-0 print:border-black/30"
  const extra = bed.isExtra ? (
    <span className="shrink-0 text-xs text-muted-foreground print:text-black/70 print:lowercase">
      {t("roomOverview.extraBed")}
    </span>
  ) : null
  if (bed.kind === "free") {
    return (
      <li className={cn(rowClass, "bg-muted print:bg-transparent")}>
        <span
          aria-hidden
          className="size-3 shrink-0 rounded-full border border-dashed border-input print:hidden"
        />
        <span className="flex-1 text-muted-foreground print:flex-none print:text-xs print:text-black/70 print:lowercase">
          {t("roomOverview.freeBed")}
        </span>
        <span
          aria-hidden
          className="hidden h-4 flex-1 border-b border-black print:block"
        />
        {extra}
      </li>
    )
  }
  const { participant } = bed
  return (
    <li className={rowClass}>
      <span
        aria-hidden
        className="size-3 shrink-0 rounded-full bg-primary print:hidden"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <span className="min-w-0 break-words">{participantName(participant)}</span>
        <BirthYear year={participant.birthYear} />
      </span>
      {participant.status === "TO_EVALUATE" ? (
        <Badge
          variant="secondary"
          className="shrink-0 print:border print:border-black print:bg-transparent print:text-black"
        >
          {t("roomAssignments.statusToEvaluate")}
        </Badge>
      ) : null}
      {extra}
    </li>
  )
}

/** "nar. 2011" on screen, just the year on paper where the column makes the meaning clear. */
function BirthYear({ year }: { year: number }) {
  const { t } = useTranslation("events")
  return (
    <span className="shrink-0 text-sm text-muted-foreground print:text-black/70">
      <span className="print:hidden">{t("roomOverview.born", { year })}</span>
      <span className="hidden print:inline">{year}</span>
    </span>
  )
}
