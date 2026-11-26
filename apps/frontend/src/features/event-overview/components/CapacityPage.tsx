import type { ReactNode } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { CheckCircle2, ChevronRight, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { CapacityProgress } from "@/components/atoms/CapacityProgress"
import { Seo } from "@/components/atoms/Seo"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { TermLabel } from "@/components/molecules/TermLabel"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateRange } from "@/lib/date"
import { roomCapacityIncreaseKey, type RoomCapacityIncrease } from "@/lib/room-capacity-increase"
import { termName, termTitle } from "@/lib/term-label"
import { cn } from "@/lib/utils"

import {
  occupancyQueryOptions,
  type OccupancyFigures,
  type TermOccupancy,
} from "@/features/event-overview/api/occupancy"
import { UnfinishedEvent } from "@/features/event-overview/components/UnfinishedEvent"
import type { ApplicationsSearch } from "@/features/event-overview/lib/applications-search"

type Gender = "FEMALE" | "MALE"
type Room = { gender: Gender | null; beds: number }

const GENDERS = ["FEMALE", "MALE"] as const

/** Rooms of one gender grouped by their beds with the extra beds (přistýlky), largest first: `[{ beds: 5, count: 10 }]`. */
function roomGroups(rooms: readonly Room[], gender: Gender) {
  const groups = new Map<number, number>()
  for (const room of rooms) {
    if (room.gender !== gender) continue
    groups.set(room.beds, (groups.get(room.beds) ?? 0) + 1)
  }
  return [...groups].sort(([a], [b]) => b - a).map(([beds, count]) => ({ beds, count }))
}

/**
 * Capacity of an event: the list of all terms (women / men side by side in
 * gendered rooms, one bar in shared rooms) and, with `termId`, the detail of
 * one term. A whole row or card is the link; the numbers are plain text.
 * `rooms` only feeds the room summary of the detail, so the route passes it in.
 */
// Figma v2: US-26 Kapacita · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=18770-24198 (mobile 18770-24345). The all-terms list and
// the term detail behind `?termId=` stay as approved in N3 / N4 (docs/FIGMA-REMAKE.md, 25. 10.).
export function CapacityPage({
  eventId,
  termId,
  rooms = [],
}: {
  eventId: string
  termId?: string
  rooms?: readonly Room[]
}) {
  const { t } = useTranslation("eventOverview")
  const query = useQuery(occupancyQueryOptions(eventId))
  const occupancy = query.data
  const selected = occupancy?.terms.find((term) => term.id === termId)

  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("capacity.title")} />
      <SectionHeader title={t("capacity.title")} />
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
      ) : occupancy.terms.length === 0 || occupancy.terms.every((term) => term.roomCount === 0) ? (
        <UnfinishedEvent
          eventId={eventId}
          hasTerms={occupancy.terms.length > 0}
          hasRooms={occupancy.terms.some((term) => term.roomCount > 0)}
        />
      ) : selected ? (
        <TermDetail
          eventId={eventId}
          term={selected}
          rooms={rooms}
        />
      ) : (
        <TermList
          eventId={eventId}
          terms={occupancy.terms}
        />
      )}
    </div>
  )
}

function ManageRoomsButton({ eventId, termId }: { eventId: string; termId?: string }) {
  const { t } = useTranslation("eventOverview")

  return (
    <Button
      asChild
      variant="outline"
      size="lg"
    >
      <Link
        to={ROUTES.organizer.eventRooms}
        params={{ eventId }}
        search={{ termId }}
      >
        {t("capacity.manageRooms")}
      </Link>
    </Button>
  )
}

/** "48 / 50" with its bar; the figure turns red when more are confirmed than there are beds. */
function Filled({
  label,
  confirmed,
  capacity,
}: {
  label: string
  confirmed: number
  capacity: number
}) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <CapacityProgress
        confirmed={confirmed}
        capacity={capacity}
        label={label}
        className="min-w-0 flex-1 lg:max-w-30"
      />
      <span
        className={cn(
          "shrink-0 text-sm font-medium whitespace-nowrap tabular-nums",
          confirmed > capacity && "text-destructive",
        )}
      >
        {confirmed} / {capacity}
      </span>
    </span>
  )
}

export function TermList({ eventId, terms }: { eventId: string; terms: TermOccupancy[] }) {
  const { t } = useTranslation("eventOverview")
  // The room mode belongs to the term; the women / men columns are there when any term is gendered.
  const isGendered = terms.some((term) => term.byGender !== null)
  const columns = isGendered
    ? "lg:grid-cols-[minmax(0,1fr)_15rem_15rem_7.5rem_3.5rem]"
    : "lg:grid-cols-[minmax(0,1fr)_15rem_7.5rem_7.5rem_3.5rem]"

  return (
    <Card className="gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold tracking-tight">{t("capacity.tableTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("capacity.tableHint")}</p>
        </div>
        <ManageRoomsButton eventId={eventId} />
      </div>
      <div>
        <div
          className={cn(
            "hidden h-10 items-center rounded-md bg-muted px-3 text-xs font-medium text-muted-foreground lg:grid",
            columns,
          )}
        >
          <span>{t("capacity.termColumn")}</span>
          {isGendered ? (
            <>
              <span>{t("capacity.women")}</span>
              <span>{t("capacity.men")}</span>
            </>
          ) : (
            <>
              <span>{t("capacity.confirmedColumn")}</span>
              <span className="text-right">{t("capacity.freeColumn")}</span>
            </>
          )}
          <span className="text-right">{t("capacity.waitlistedColumn")}</span>
          <span />
        </div>
        <ul className="flex flex-col">
          {terms.map((term) => (
            <li
              key={term.id}
              className="border-b border-border last:border-b-0"
            >
              <Link
                to={ROUTES.organizer.eventCapacity}
                params={{ eventId }}
                search={{ termId: term.id }}
                className={cn(
                  "relative -mx-3 grid grid-cols-1 gap-x-4 gap-y-2 rounded-md px-3 py-3 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring lg:grid-cols-none lg:mx-0 lg:items-center lg:py-2.5",
                  columns,
                )}
              >
                <span className="pr-8 lg:pr-0">
                  <TermLabel term={term} />
                </span>
                {term.byGender ? (
                  GENDERS.map((gender) => (
                    <Cell
                      key={gender}
                      label={t(gender === "FEMALE" ? "capacity.women" : "capacity.men")}
                    >
                      <Filled
                        label={t(gender === "FEMALE" ? "capacity.women" : "capacity.men")}
                        confirmed={term.byGender![gender].confirmed}
                        capacity={term.byGender![gender].capacity}
                      />
                    </Cell>
                  ))
                ) : isGendered ? (
                  <Cell
                    label={t("capacity.confirmedColumn")}
                    className="lg:col-span-2"
                  >
                    <Filled
                      label={t("capacity.confirmedColumn")}
                      confirmed={term.confirmed}
                      capacity={term.capacity}
                    />
                  </Cell>
                ) : (
                  <>
                    <Cell label={t("capacity.confirmedColumn")}>
                      <Filled
                        label={t("capacity.confirmedColumn")}
                        confirmed={term.confirmed}
                        capacity={term.capacity}
                      />
                    </Cell>
                    <Cell
                      label={t("capacity.freeColumn")}
                      className="lg:justify-end"
                    >
                      <span className="text-sm font-medium tabular-nums">{term.free}</span>
                    </Cell>
                  </>
                )}
                <Cell
                  label={t("capacity.waitlistedColumn")}
                  className="lg:justify-end"
                >
                  <span
                    className={cn(
                      "text-sm font-medium tabular-nums",
                      term.waitlisted === 0 && "text-muted-foreground",
                    )}
                  >
                    {term.waitlisted}
                  </span>
                </Cell>
                <ChevronRight
                  aria-hidden
                  className="absolute top-4 right-0 size-5 text-muted-foreground lg:static lg:justify-self-end"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

/** A cell of a list row; below `lg` it names itself, above it the column header does. */
function Cell({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <span className="w-20 shrink-0 text-xs text-muted-foreground lg:sr-only">{label}</span>
      {children}
    </span>
  )
}

function TermDetail({
  eventId,
  term,
  rooms,
}: {
  eventId: string
  term: TermOccupancy
  rooms: readonly Room[]
}) {
  const { t } = useTranslation(["eventOverview", "events"])
  const byGender = term.byGender
  const storedIncrease = useQueryClient().getQueryData<RoomCapacityIncrease>(
    roomCapacityIncreaseKey(eventId, term.id),
  )
  const increase =
    storedIncrease &&
    byGender &&
    GENDERS.every((gender) => byGender[gender].capacity === storedIncrease.capacity[gender])
      ? storedIncrease
      : undefined
  const changedFigures = increase && byGender?.[increase.gender]
  const isGendered = byGender !== null
  const overCapacity = byGender ? GENDERS.filter((gender) => byGender[gender].free < 0) : []
  const isWomenOnly = byGender !== null && byGender.FEMALE.free > 0 && byGender.MALE.free <= 0
  const isMenOnly = byGender !== null && byGender.MALE.free > 0 && byGender.FEMALE.free <= 0

  return (
    <>
      <div className="flex items-center gap-3">
        <BackLink
          to={ROUTES.organizer.eventCapacity}
          params={{ eventId }}
          search={{ termId: undefined }}
        >
          {t("capacity.backToTerms")}
        </BackLink>
        <div className="ml-auto">
          <ManageRoomsButton
            eventId={eventId}
            termId={term.id}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-semibold tracking-tight">{termTitle(term)}</h3>
        {termName(term) ? (
          <p className="text-sm">
            {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-3 md:gap-6">
        <MetricCard
          eventId={eventId}
          search={{ term: term.id, status: "CONFIRMED" }}
          label={t("capacity.totalCapacity")}
          figures={term}
          helper={
            byGender
              ? t("capacity.totalCapacityBreakdown", {
                  count: byGender.FEMALE.capacity,
                  men: byGender.MALE.capacity,
                })
              : freeText(term, t)
          }
        />
        {byGender
          ? GENDERS.map((gender) => (
              <MetricCard
                key={gender}
                eventId={eventId}
                search={{ term: term.id, status: "CONFIRMED", gender }}
                label={t("capacity.genderCapacity", {
                  gender: t(gender === "FEMALE" ? "capacity.women" : "capacity.men"),
                  count: byGender[gender].capacity,
                })}
                figures={byGender[gender]}
                helper={[
                  freeText(byGender[gender], t),
                  ...roomGroups(rooms, gender).map((group) =>
                    t(gender === "FEMALE" ? "capacity.roomsFemale" : "capacity.roomsMale", group),
                  ),
                ].join(" · ")}
              />
            ))
          : null}
      </div>
      {increase && changedFigures ? (
        <Alert
          role="status"
          className="border-border bg-status-success-bg"
        >
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle className="line-clamp-none">
            {t(increase.gender === "FEMALE" ? "capacity.increasedWomen" : "capacity.increasedMen", {
              count: increase.addedBeds,
            })}
          </AlertTitle>
          <AlertDescription>
            {t(
              increase.gender === "FEMALE"
                ? "capacity.increaseWomenDetail"
                : "capacity.increaseMenDetail",
              {
                confirmed: t("events:terms.cancelDialog.confirmed", {
                  count: changedFigures.confirmed,
                }),
                beds: t("capacity.increaseBedTotal", { count: changedFigures.capacity }),
                free:
                  changedFigures.free < 0
                    ? t("capacity.missingBeds", { count: -changedFigures.free })
                    : t("capacity.increaseFree", { count: changedFigures.free }),
              },
            )}
          </AlertDescription>
        </Alert>
      ) : null}
      {overCapacity.length > 0 && byGender ? (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle className="line-clamp-none">{t("capacity.overCapacityTitle")}</AlertTitle>
          <AlertDescription>
            {overCapacity.map((gender) => (
              <p key={gender}>
                {t("capacity.overCapacity", {
                  gender: t(gender === "FEMALE" ? "capacity.women" : "capacity.men"),
                  excess: -byGender[gender].free,
                  confirmed: byGender[gender].confirmed,
                  count: byGender[gender].capacity,
                })}
              </p>
            ))}
          </AlertDescription>
        </Alert>
      ) : null}
      {isGendered && (isWomenOnly || isMenOnly) ? (
        <Alert
          role="status"
          className="border-status-info bg-status-info-bg text-status-info"
        >
          <TriangleAlert aria-hidden="true" />
          <AlertTitle className="line-clamp-none">
            {t(isWomenOnly ? "capacity.womenOnlyTitle" : "capacity.menOnlyTitle")}
          </AlertTitle>
          <AlertDescription className="text-status-info">
            {t("capacity.confirmedOnly")}{" "}
            {isWomenOnly
              ? t("capacity.remainingWomen", { count: byGender.FEMALE.free })
              : t("capacity.remainingMen", { count: byGender.MALE.free })}
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  )
}

function freeText(
  figures: OccupancyFigures,
  t: ReturnType<typeof useTranslation<"eventOverview">>["t"],
) {
  return figures.free < 0
    ? t("capacity.missingBeds", { count: -figures.free })
    : t("capacity.freePlaces", { count: figures.free })
}

/** A figure of the term; the whole card opens the confirmed applications behind it. */
function MetricCard({
  eventId,
  search,
  label,
  figures,
  helper,
}: {
  eventId: string
  search: ApplicationsSearch
  label: string
  figures: OccupancyFigures
  helper: string
}) {
  const { t } = useTranslation("eventOverview")
  const isOver = figures.confirmed > figures.capacity

  return (
    <Card className={cn("gap-2 px-6", isOver && "border-destructive bg-destructive/8")}>
      <h4 className="text-xs font-medium text-muted-foreground">{label}</h4>
      <p
        className={cn(
          "text-4xl font-bold tracking-tight tabular-nums",
          isOver && "text-destructive",
        )}
      >
        {figures.confirmed} / {figures.capacity}
      </p>
      <CapacityProgress
        confirmed={figures.confirmed}
        capacity={figures.capacity}
        label={label}
      />
      <p className="text-sm text-muted-foreground">{helper}</p>
      <div className="mt-auto flex flex-wrap gap-2">
        <Button
          asChild
          variant="outline"
        >
          <Link
            to={ROUTES.organizer.eventApplications}
            params={{ eventId }}
            search={search}
            aria-label={label + " · " + t("capacity.openApplications")}
          >
            {t("capacity.openApplications")}
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
        >
          <Link
            to={ROUTES.organizer.eventApplications}
            params={{ eventId }}
            search={{ ...search, status: "WAITLISTED" }}
            aria-label={label + " · " + t("capacity.waitlistedColumn")}
          >
            {t("capacity.waitlistedColumn")} ({figures.waitlisted})
          </Link>
        </Button>
      </div>
    </Card>
  )
}
