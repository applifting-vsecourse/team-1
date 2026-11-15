import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle } from "lucide-react"
import { useTranslation } from "react-i18next"

import { EmptyState } from "@/components/molecules/EmptyState"
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
  type UnassignedParticipant,
} from "@/features/events/api/room-assignments"
import type { TermRooms } from "@/features/events/api/rooms"
import { ExtraBeds } from "@/features/events/components/AssignmentParts"
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

// Who sleeps where in one term, read-only, printable on A4: the rooms as cards like in the room
// assignment (name, gender, occupancy bar, extra beds) with their beds (people with the year of
// birth, free beds), and the confirmed people still without a room.
// Individual accommodation (US-38) is deliberately not read here (D-161); no warnings of US-37 are
// listed, only a small line back to the assignment where they are handled.
// Figma (Design system): #36 / Přehled ubytování · výchozí · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=25846-112117 (mobile 25846-112551, print A4 25847-112218 · 25847-112433)
// Figma (Design system): #36 / s odkazem na varování · bez přiřazení · plně obsazený · smíšené pokoje · přistýlka · bez pokojů · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=25786-111071
// Changes over the first frames (review of the implementation): view picker as a select left of
// the term, room cards like in the assignment, equal card size, small warning line, no "edit"
// button, structured print header, "Smíšený" instead of "Společný".
export function RoomsOverview({
  term,
  selectors,
  onShowAssignment,
}: {
  term: TermRooms
  /** The view and term pickers of the rooms page, shown first in the toolbar. */
  selectors: ReactNode
  /** To the room assignment (US-35): from the warning line and from a term without rooms. */
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
  // The same count as the summary of the room assignment: rules broken and confirmed without a bed.
  const openWarnings = data.summary.violations + data.summary.confirmedWithoutBed
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
  const printFacts = [
    {
      label: t("rooms.termLabel"),
      value: termDatesLine({ ...term, name: term.termName }),
      isWide: true,
    },
    { label: t("roomOverview.rooms"), value: totals.rooms, isWide: false },
    { label: t("roomOverview.beds"), value: totals.beds, isWide: false },
    { label: t("roomOverview.occupied"), value: totals.occupied, isWide: false },
    { label: t("roomOverview.free"), value: totals.free, isWide: false },
  ]

  return (
    <section
      className="flex flex-col gap-6 print:text-black"
      data-print-area
    >
      <div className="hidden flex-col gap-3 print:flex">
        <div className="flex items-end justify-between gap-4 border-b-2 border-black pb-2">
          <div className="flex flex-col gap-1">
            <p className="text-xs tracking-wide uppercase">{t("roomOverview.viewOverview")}</p>
            <h2 className="text-xl font-semibold">{term.eventName}</h2>
          </div>
          <p className="text-xs">{t("roomOverview.printed", { date: formatDate(new Date()) })}</p>
        </div>
        <dl className="grid grid-cols-6 border border-black">
          {printFacts.map((fact) => (
            <div
              key={fact.label}
              className={cn(
                "flex flex-col gap-1 border-l border-black px-3 py-2 first:border-l-0",
                fact.isWide && "col-span-2",
              )}
            >
              <dt className="text-xs text-black/70">{fact.label}</dt>
              <dd className="text-sm font-semibold">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        {selectors}
        <Button
          size="lg"
          className="max-sm:w-full"
          disabled={!hasRooms}
          onClick={() => window.print()}
        >
          {t("roomOverview.print")}
        </Button>
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
            <div
              role="status"
              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-status-warning/30 bg-status-warning-bg px-3 py-2.5 print:hidden"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-status-warning/15 text-status-warning">
                <AlertTriangle
                  className="size-4"
                  aria-hidden
                />
              </span>
              <p className="min-w-0 flex-1 text-sm font-medium break-words">
                {t("roomOverview.warnings", { count: openWarnings })}
              </p>
              {/* The warning button of the assignment, a little lighter. */}
              <Button
                type="button"
                size="sm"
                className="bg-status-warning/85 text-status-warning-bg hover:bg-status-warning"
                onClick={onShowAssignment}
              >
                {t("roomOverview.showWarnings")}
              </Button>
            </div>
          ) : null}
          <ul className="grid items-stretch gap-4 md:auto-rows-fr md:grid-cols-2 print:block print:columns-2 print:gap-4">
            {data.rooms.map((room) => (
              <li
                key={room.id}
                className="print:mb-4 print:break-inside-avoid"
              >
                <RoomOverviewCard room={room} />
              </li>
            ))}
          </ul>
          {withoutRoom.length > 0 ? <WithoutRoomCard people={withoutRoom} /> : null}
        </>
      ) : (
        <div className="rounded-lg border border-border px-6 print:hidden">
          <EmptyState
            message={t("rooms.empty")}
            action={
              <Button
                size="lg"
                onClick={onShowAssignment}
              >
                {t("roomOverview.emptyAction")}
              </Button>
            }
          />
        </div>
      )}
    </section>
  )
}

/** A room like in the room assignment: name and gender, occupancy with a bar, extra beds, people. */
function RoomOverviewCard({ room }: { room: AssignmentRoom }) {
  const { t } = useTranslation("events")
  const { roomGenderLabel, freeBedsLabel } = useAssignmentLabels()
  const count = room.participants.length
  const isFull = count >= room.beds
  const share = Math.min(100, Math.round((count / Math.max(1, room.beds)) * 100))
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card print:overflow-visible print:rounded-none print:border-black">
      <div className="flex flex-col gap-3 p-4 print:flex-row print:items-center print:justify-between print:gap-3 print:px-2 print:py-2">
        <div className="flex flex-wrap items-center justify-center gap-2 print:justify-start">
          <h3 className="font-semibold break-words">{room.name}</h3>
          <Badge
            variant="secondary"
            className="print:border-0 print:bg-transparent print:p-0 print:font-normal print:text-black/70 print:lowercase"
          >
            {room.gender ? roomGenderLabel(room.gender) : t("roomOverview.mixed")}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold whitespace-nowrap">
            {count} / {room.beds}
            {room.extraBeds > 0 ? (
              <span className="hidden print:inline">
                {" · "}
                {t("roomOverview.printExtraBeds", { count: room.extraBeds })}
              </span>
            ) : null}
          </span>
          <div
            role="presentation"
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary print:hidden"
          >
            <div
              className={cn("h-full rounded-full", isFull ? "bg-muted-foreground" : "bg-primary")}
              style={{ width: `${share}%` }}
            />
          </div>
          <Badge
            variant={isFull ? "secondary" : "success"}
            className="print:hidden"
          >
            {freeBedsLabel(room)}
          </Badge>
        </div>
        {room.extraBeds > 0 ? (
          <div className="flex justify-end print:hidden">
            <ExtraBeds room={room} />
          </div>
        ) : null}
      </div>
      <ul className="flex-1 border-t border-border print:border-black">
        {overviewBeds(room).map((bed, index) => (
          <BedRow
            key={bed.kind === "taken" ? bed.participant.applicationTermId : `free-${index}`}
            bed={bed}
          />
        ))}
      </ul>
    </div>
  )
}

function BedRow({ bed }: { bed: OverviewBed }) {
  const { t } = useTranslation("events")
  const rowClass =
    "flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0 print:border-black/30 print:px-2"
  // Which bed is an extra one matters on paper only; on screen the room says how many it has.
  const extra = bed.isExtra ? (
    <span className="hidden shrink-0 text-xs text-black/70 lowercase print:inline">
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
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="break-words">{participantName(participant)}</span>
        {participant.status === "TO_EVALUATE" ? (
          <Badge
            variant="secondary"
            className="shrink-0 print:border print:border-black print:bg-transparent print:text-black"
          >
            {t("roomAssignments.statusToEvaluate")}
          </Badge>
        ) : null}
      </span>
      <BirthYear year={participant.birthYear} />
      {extra}
    </li>
  )
}

/** The confirmed people nobody has put in a room yet: name, gender and status, year of birth. */
function WithoutRoomCard({ people }: { people: UnassignedParticipant[] }) {
  const { t } = useTranslation("events")
  const { genderLabel, statusLabel } = useAssignmentLabels()
  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-border bg-card print:break-inside-avoid print:overflow-visible print:rounded-none print:border-black">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 print:border-black print:px-2">
        <h3 className="font-semibold">{t("roomOverview.unassignedTitle")}</h3>
        <Badge
          variant="secondary"
          className="print:hidden"
        >
          {people.length}
        </Badge>
        <span className="hidden font-semibold print:inline">· {people.length}</span>
      </div>
      <ul className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2 print:gap-2 print:p-2">
        {people.map((person) => (
          <li
            key={person.applicationTermId}
            className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 print:rounded-none print:border-black/30"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium break-words">{participantName(person)}</span>
              <span className="text-sm text-muted-foreground print:hidden">
                {genderLabel(person.gender)} · {statusLabel(person.status, person.gender)}
              </span>
            </span>
            <BirthYear year={person.birthYear} />
          </li>
        ))}
      </ul>
    </section>
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
