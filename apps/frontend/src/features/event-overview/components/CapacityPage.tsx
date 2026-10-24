import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { TermLabel } from "@/components/molecules/TermLabel"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDateRange } from "@/lib/date"

import {
  occupancyQueryOptions,
  type OccupancyFigures,
  type TermOccupancy,
} from "@/features/event-overview/api/occupancy"
import type { ApplicationsSearch } from "@/features/event-overview/lib/applications-search"

type Gender = "FEMALE" | "MALE"

/** A count that opens the applications list filtered by term and status; only the number is underlined. */
function CountLink({
  eventId,
  search,
  count,
}: {
  eventId: string
  search: ApplicationsSearch
  count: number
}) {
  return (
    <Link
      to={ROUTES.organizer.eventApplications}
      params={{ eventId }}
      search={search}
      className="font-medium text-link underline underline-offset-2"
    >
      {count}
    </Link>
  )
}

/** A zero opens nothing worth seeing, so it stays plain text. */
function Count({
  eventId,
  search,
  count,
}: {
  eventId: string
  search: ApplicationsSearch
  count: number
}) {
  return count > 0 ? (
    <CountLink
      eventId={eventId}
      search={search}
      count={count}
    />
  ) : (
    <span className="text-muted-foreground">0</span>
  )
}

// Capacity of an event per term: women / men separately in gendered rooms, one table for shared rooms.
// Figma (Design system): O08 Přehled kapacit · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12232-408
// Figma (Design system): O08d Obsazenost všech termínů · společné pokoje · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12768-3229
export function CapacityPage({ eventId }: { eventId: string }) {
  const { t } = useTranslation("eventOverview")
  const query = useQuery(occupancyQueryOptions(eventId))
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null)

  const occupancy = query.data
  const terms = occupancy?.terms ?? []
  const selected = terms.find((term) => term.id === selectedTermId) ?? terms[0]

  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("capacity.title")} />
      <SectionHeader
        title={t("capacity.title")}
        description={t("capacity.description")}
        actions={
          <Button
            asChild
            variant="outline"
            size="lg"
          >
            <Link
              to={ROUTES.organizer.eventRooms}
              params={{ eventId }}
            >
              {t("capacity.manageRooms")}
            </Link>
          </Button>
        }
      />
      {query.isError ? (
        <ErrorState
          title={t("capacity.loadFailed")}
          error={query.error}
          onRetry={() => {
            void query.refetch()
          }}
        />
      ) : !occupancy ? (
        <LoadingState />
      ) : !selected ? (
        <EmptyState message={t("capacity.empty")} />
      ) : occupancy.roomMode === "GENDERED" && selected.byGender ? (
        <GenderedCapacity
          eventId={eventId}
          terms={terms}
          selected={selected}
          byGender={selected.byGender}
          onSelect={setSelectedTermId}
        />
      ) : (
        <SharedCapacity
          eventId={eventId}
          terms={terms}
        />
      )}
    </div>
  )
}

function GenderedCapacity({
  eventId,
  terms,
  selected,
  byGender,
  onSelect,
}: {
  eventId: string
  terms: TermOccupancy[]
  selected: TermOccupancy
  byGender: Record<Gender, OccupancyFigures>
  onSelect: (termId: string) => void
}) {
  const { t } = useTranslation("eventOverview")
  const isWomenOnly = byGender.FEMALE.free > 0 && byGender.MALE.free <= 0
  const isMenOnly = byGender.MALE.free > 0 && byGender.FEMALE.free <= 0

  return (
    <>
      <Select
        value={selected.id}
        onValueChange={onSelect}
      >
        <SelectTrigger
          aria-label={t("capacity.termFilter")}
          className="w-full bg-card sm:w-60"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {terms.map((term) => (
            <SelectItem
              key={term.id}
              value={term.id}
            >
              {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {(["FEMALE", "MALE"] as const).map((gender) => {
          const figures = byGender[gender]
          return (
            <Card key={gender}>
              <CardContent className="flex flex-col gap-2">
                <h3 className="text-xs font-medium text-muted-foreground">
                  {t("capacity.genderCapacity", {
                    gender: t(gender === "FEMALE" ? "capacity.women" : "capacity.men"),
                    count: figures.capacity,
                  })}
                </h3>
                <p className="text-3xl font-bold tracking-tight tabular-nums md:text-4xl">
                  <CountLink
                    eventId={eventId}
                    search={{ term: selected.id, status: "CONFIRMED", gender }}
                    count={figures.confirmed}
                  />{" "}
                  / {figures.capacity}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("capacity.freePlaces", { count: figures.free })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("capacity.waitlisted")}:{" "}
                  <Count
                    eventId={eventId}
                    search={{ term: selected.id, status: "WAITLISTED", gender }}
                    count={figures.waitlisted}
                  />
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
      {isWomenOnly || isMenOnly ? (
        <div
          role="status"
          className="flex flex-col gap-1 rounded-lg border border-primary bg-accent px-4 py-3 text-sm text-primary"
        >
          <p className="font-semibold">
            {t(isWomenOnly ? "capacity.womenOnlyTitle" : "capacity.menOnlyTitle")}
          </p>
          <p>{t("capacity.confirmedOnly")}</p>
        </div>
      ) : null}
    </>
  )
}

function SharedCapacity({ eventId, terms }: { eventId: string; terms: TermOccupancy[] }) {
  const { t } = useTranslation("eventOverview")
  const columns = "lg:grid-cols-[minmax(0,1fr)_20rem_7rem_7rem]"

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold tracking-tight">{t("capacity.tableTitle")}</h3>
            <p className="text-sm text-muted-foreground">{t("capacity.tableHint")}</p>
          </div>
          <div
            className={`hidden h-10 items-center gap-4 rounded-md bg-muted px-3 text-xs text-muted-foreground lg:grid ${columns}`}
          >
            <span>{t("capacity.termColumn")}</span>
            <span>{t("capacity.confirmedColumn")}</span>
            <span className="text-right">{t("capacity.freeColumn")}</span>
            <span className="text-right">{t("capacity.waitlistedColumn")}</span>
          </div>
          <ul className="flex flex-col">
            {terms.map((term) => (
              <li
                key={term.id}
                className={`grid min-h-14 grid-cols-2 items-center gap-x-4 gap-y-2 border-b px-3 py-3 text-sm last:border-b-0 lg:grid-cols-none lg:py-2 ${columns}`}
              >
                <div className="col-span-2 lg:col-span-1">
                  <TermLabel term={term} />
                </div>
                <div className="col-span-2 flex items-center gap-2 lg:col-span-1">
                  <Progress
                    value={
                      term.capacity > 0 ? Math.min(100, (term.confirmed / term.capacity) * 100) : 0
                    }
                    aria-label={t("capacity.confirmedColumn")}
                    className="w-40 shrink-0"
                  />
                  <span className="font-medium tabular-nums">
                    <CountLink
                      eventId={eventId}
                      search={{ term: term.id, status: "CONFIRMED" }}
                      count={term.confirmed}
                    />{" "}
                    / {term.capacity}
                  </span>
                </div>
                <div className="flex justify-between gap-2 lg:justify-end">
                  <span className="text-muted-foreground lg:sr-only">
                    {t("capacity.freeColumn")}
                  </span>
                  <span className="font-semibold tabular-nums">{term.free}</span>
                </div>
                <div className="flex justify-between gap-2 lg:justify-end">
                  <span className="text-muted-foreground lg:sr-only">
                    {t("capacity.waitlistedColumn")}
                  </span>
                  <Count
                    eventId={eventId}
                    search={{ term: term.id, status: "WAITLISTED" }}
                    count={term.waitlisted}
                  />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">{t("capacity.sharedNote")}</p>
    </>
  )
}
