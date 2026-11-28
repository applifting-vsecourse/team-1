import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ChevronRight, Plus, Search, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import Empty from "@/assets/illustrations/empty.svg?react"
import { BrandDivider } from "@/components/atoms/BrandDivider"
import { DateTile } from "@/components/atoms/DateTile"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Pagination } from "@/components/molecules/Pagination"
import { ViewToggleGroup, ViewToggleGroupItem } from "@/components/molecules/ViewToggleGroup"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePagination } from "@/hooks/usePagination"
import { cn } from "@/lib/utils"

import { eventsQueryOptions, type OrganizerEvent } from "@/features/events/api/events"
import { EventFiltersSheet } from "@/features/events/components/EventFiltersSheet"
import { termsSummary } from "@/features/events/lib/terms-summary"

/**
 * The organizer's events: the H1 with the one primary „Vytvořit akci“ and the BrandDivider, a
 * toolbar to search and filter them, and one ink-edged list with a grey column header. The event
 * that was just created is highlighted (the toast comes from the form). Without any event the page
 * is the first run: the illustration, one sentence and the one CTA, no button in the header.
 */
// Figma (Design system v2): F5 / Akce · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15376-2 (mobile 15376-98)
// Figma (Design system v2): F5 / Akce · filtr organizace · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15376-300 (mobile 15376-361)
// Figma (Design system v2): F5 / Akce · první spuštění · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27777-148660 (mobile 27777-148725)
export function EventList({ createdEventId }: { createdEventId?: string }) {
  const { t } = useTranslation("events")
  const { data, isPending, error, refetch } = useQuery(eventsQueryOptions())
  const isFirstRun = data?.length === 0

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="min-w-0 text-[32px]/10 font-bold break-words">{t("list.title")}</h1>
          {isFirstRun ? null : <CreateEventButton />}
        </div>
        <BrandDivider />
      </header>
      {isPending ? <LoadingState /> : null}
      {error ? (
        <ErrorState
          title={t("list.errorTitle")}
          error={error}
          onRetry={() => void refetch()}
        />
      ) : null}
      {isFirstRun ? (
        <EmptyState
          title={t("list.empty")}
          illustration={<Empty className="h-45 w-60" />}
          action={<CreateEventButton className="w-70 md:w-90" />}
          className="py-12 md:pt-22"
        />
      ) : null}
      {data && data.length > 0 ? (
        <FilteredEvents
          events={data}
          createdEventId={createdEventId}
        />
      ) : null}
    </div>
  )
}

function CreateEventButton({ className }: { className?: string }) {
  const { t } = useTranslation("events")

  return (
    <Button
      asChild
      size="lg"
      className={cn("shrink-0", className)}
    >
      <Link to={ROUTES.organizer.newEvent}>
        <Plus aria-hidden />
        {t("list.create")}
      </Link>
    </Button>
  )
}

const STATUSES = ["all", "open", "closed"] as const
type StatusFilter = (typeof STATUSES)[number]

/** The toolbar (name, organization, status) and the events that match it, one row each. */
function FilteredEvents({
  events,
  createdEventId,
}: {
  events: OrganizerEvent[]
  createdEventId?: string
}) {
  const { t } = useTranslation("events")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [organizationId, setOrganizationId] = useState("all")
  const organizations = new Map(
    events.map((event) => [event.organizationId, event.organizationName]),
  )
  // An organizer in one organization has nothing to filter by: no organization filter then.
  const hasOrganizationFilter = organizations.size > 1

  const needle = query.trim().toLocaleLowerCase()
  const shown = events.filter(
    (event) =>
      (!needle || event.name.toLocaleLowerCase().includes(needle)) &&
      (status === "all" || event.applicationsOpen === (status === "open")) &&
      (organizationId === "all" || event.organizationId === organizationId),
  )

  const { pageItems, ...pagination } = usePagination(shown, `${needle}|${status}|${organizationId}`)

  return (
    <section className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        {/* Below lg the search and the filter icon share one row; the status segment gets its own. */}
        <div className="flex min-w-0 items-center gap-2 lg:w-80">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("list.searchPlaceholder")}
              aria-label={t("list.search")}
              className="w-full ps-11"
            />
          </div>
          {hasOrganizationFilter ? (
            <EventFiltersSheet
              organizations={organizations}
              organizationId={organizationId}
              onOrganizationChange={setOrganizationId}
              className="lg:hidden"
            />
          ) : null}
        </div>
        {/* From lg the organization is a Select without a label above it (Figma F5): its value names it. */}
        {hasOrganizationFilter ? (
          <div className="hidden items-center gap-3 lg:flex">
            <Select
              value={organizationId}
              onValueChange={setOrganizationId}
            >
              <SelectTrigger
                aria-label={t("list.organizationFilter")}
                className="w-60 text-start"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("list.organizationAll")}</SelectItem>
                {Array.from(organizations, ([id, name]) => (
                  <SelectItem
                    key={id}
                    value={id}
                  >
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {organizationId === "all" ? null : (
              <Button
                type="button"
                variant="ghost"
                className="shrink-0"
                onClick={() => setOrganizationId("all")}
              >
                {t("list.clearOrganization")}
              </Button>
            )}
          </div>
        ) : null}
        {/* Figma (Design system v2): F5 / Events / Filtry seznamu akcí · Mobil · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15376-98 (component 27893-4901) */}
        <ViewToggleGroup
          className="lg:ml-auto"
          aria-label={t("list.statusFilter")}
          value={status}
          onValueChange={(value) => {
            const next = STATUSES.find((option) => option === value)
            if (next) setStatus(next)
          }}
        >
          {STATUSES.map((option) => (
            <ViewToggleGroupItem
              key={option}
              value={option}
            >
              {t(`list.segment.${option}`)}
            </ViewToggleGroupItem>
          ))}
        </ViewToggleGroup>
        {organizationId === "all" ? null : (
          <div
            role="group"
            aria-label={t("list.activeFilters")}
            className="flex flex-wrap gap-2 lg:hidden"
          >
            <Button
              variant="outline"
              size="lg"
              className="h-auto min-h-11 max-w-full"
              aria-label={t("list.removeFilter", { filter: organizations.get(organizationId) })}
              onClick={() => setOrganizationId("all")}
            >
              <span className="min-w-0 text-left break-words whitespace-normal">
                {organizations.get(organizationId)}
              </span>
              <X
                aria-hidden
                className="size-4 shrink-0"
              />
            </Button>
          </div>
        )}
      </div>
      {shown.length === 0 ? (
        <EmptyState message={t("list.noMatch")} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-strong bg-card">
          <div
            aria-hidden
            className="hidden h-10 items-center gap-4 border-b border-border bg-wash px-4 text-xs/4.5 font-medium text-muted-foreground lg:flex"
          >
            <span className="flex-1">{t("list.eventColumn")}</span>
            <span className="w-50">{t("list.statusColumn")}</span>
            <span className="w-50">{t("list.occupancy")}</span>
            <span className="w-5" />
          </div>
          <ul>
            {pageItems.map((event) => (
              // The event that was just created keeps the selected surface (O02a).
              <li
                key={event.id}
                data-created={event.id === createdEventId || undefined}
                className={cn(
                  "border-b border-border last:border-b-0",
                  event.id === createdEventId && "bg-accent/60",
                )}
              >
                <EventRow
                  event={event}
                  hasOrganization={hasOrganizationFilter && organizationId === "all"}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      <Pagination
        {...pagination}
        onPageChange={pagination.setPage}
      />
    </section>
  )
}

/**
 * One event: the date tile, the name, „organization · dates · place“ (the organization only when the
 * events belong to several and the list isn't filtered to one), whether applications are open and how full it is. A phone
 * stacks the status and the occupancy under the name and drops the chevron.
 */
function EventRow({ event, hasOrganization }: { event: OrganizerEvent; hasOrganization: boolean }) {
  const { t } = useTranslation("events")
  const meta = [
    hasOrganization ? event.organizationName : null,
    termsSummary(event, t),
    event.location,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <Link
      to={ROUTES.organizer.event}
      params={{ eventId: event.id }}
      className="flex items-start gap-3 px-4 py-3 transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring lg:items-center lg:gap-4"
    >
      {event.startsOn ? (
        <DateTile date={event.startsOn} />
      ) : (
        // „Datovka“ without a term: a dashed empty tile.
        <span
          aria-hidden="true"
          className="flex h-12.5 w-12 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-wash font-semibold text-muted-foreground"
        >
          —
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex min-w-0 flex-col gap-1 lg:flex-1 lg:gap-0.5">
          <h2 className="font-semibold wrap-anywhere">{event.name}</h2>
          <p className="text-sm text-muted-foreground">{meta}</p>
        </div>
        <div className="pt-1 lg:w-50 lg:shrink-0 lg:pt-0">
          <Badge variant={event.applicationsOpen ? "success" : "warning"}>
            {event.applicationsOpen ? t("list.statusOpen") : t("list.statusClosed")}
          </Badge>
        </div>
        <Occupancy event={event} />
      </div>
      <ChevronRight
        aria-hidden
        className="hidden size-5 shrink-0 lg:block"
      />
    </Link>
  )
}

/**
 * Confirmed of all beds across the terms: „152 / 160“ in tabular figures and „potvrzených“ muted, with
 * a 4 px bar under it. The cell has a fixed width (200 px from `lg`, the content width on a phone), so
 * every bar is as long as the others whatever the count says; a dash until there are terms and rooms.
 */
function Occupancy({ event }: { event: OrganizerEvent }) {
  const { t } = useTranslation("events")
  const confirmed = event.terms.reduce((sum, term) => sum + term.confirmedCount, 0)
  const capacity = event.terms.reduce((sum, term) => sum + term.capacity, 0)

  return (
    <div
      data-slot="occupancy"
      className="flex w-full flex-col gap-1.5 lg:w-50 lg:shrink-0"
    >
      {capacity === 0 ? (
        <span className="text-sm">{t("list.noCapacity")}</span>
      ) : (
        <>
          <p className="text-sm">
            <span className="font-medium tabular-nums">
              {t("list.occupancyCount", { confirmed, capacity })}
            </span>{" "}
            <span className="text-muted-foreground">{t("list.occupancyUnit")}</span>
          </p>
          <Progress
            value={(confirmed / capacity) * 100}
            aria-label={t("list.occupancyConfirmed", { confirmed, capacity })}
            className="h-1 w-full"
          />
        </>
      )}
    </div>
  )
}
