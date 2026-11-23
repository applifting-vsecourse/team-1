import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ChevronRight, Plus, Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Pagination } from "@/components/molecules/Pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { termsSummary } from "@/features/events/lib/terms-summary"

/**
 * O02 / O02a: the organizer's events as rows with a toolbar to search and filter them; the event
 * that was just created is highlighted (the toast comes from the form).
 */
// Figma v2: US-10 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15376-2 (mobile 15376-98).
export function EventList({ createdEventId }: { createdEventId?: string }) {
  const { t } = useTranslation("events")
  const { data, isPending, error, refetch } = useQuery(eventsQueryOptions())

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        hasBand
        motif="planning"
        title={t("list.title")}
        description={t("list.description")}
        actions={
          <Button
            asChild
            size="lg"
          >
            <Link to={ROUTES.organizer.newEvent}>
              <Plus aria-hidden />
              {t("list.create")}
            </Link>
          </Button>
        }
      />
      {isPending ? <LoadingState /> : null}
      {error ? (
        <ErrorState
          title={t("list.errorTitle")}
          error={error}
          onRetry={() => void refetch()}
        />
      ) : null}
      {data?.length === 0 ? <EmptyState message={t("list.empty")} /> : null}
      {data && data.length > 0 ? (
        <FilteredEvents
          events={data}
          createdEventId={createdEventId}
        />
      ) : null}
    </div>
  )
}

type StatusFilter = "all" | "open" | "closed"

/** The toolbar (name, status, organization) and the events that match it, one row each. */
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

  const needle = query.trim().toLocaleLowerCase()
  const shown = events.filter(
    (event) =>
      (!needle || event.name.toLocaleLowerCase().includes(needle)) &&
      (status === "all" || event.applicationsOpen === (status === "open")) &&
      (organizationId === "all" || event.organizationId === organizationId),
  )

  const { pageItems, ...pagination } = usePagination(shown, `${needle}|${status}|${organizationId}`)

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-2 items-end gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="relative col-span-2 lg:col-span-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute start-[17px] top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
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
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="event-organization">{t("list.organizationFilter")}</Label>{" "}
          <Select
            value={organizationId}
            onValueChange={setOrganizationId}
          >
            <SelectTrigger
              id="event-organization"
              aria-label={t("list.organizationFilter")}
              className="w-full text-start max-lg:*:data-[slot=select-value]:whitespace-normal"
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
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="event-status">{t("list.statusFilter")}</Label>{" "}
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as StatusFilter)}
          >
            <SelectTrigger
              id="event-status"
              aria-label={t("list.statusFilter")}
              className="w-full text-start max-lg:*:data-[slot=select-value]:whitespace-normal"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("list.statusAll")}</SelectItem>
              <SelectItem value="open">{t("list.statusOpen")}</SelectItem>
              <SelectItem value="closed">{t("list.statusClosed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="min-w-0 text-xl font-semibold">
          <span>{t("list.count", { count: shown.length })}</span>
          {organizationId === "all" ? (
            <>
              {" "}
              ·{" "}
              {t("list.organizations", {
                count: new Set(shown.map((event) => event.organizationId)).size,
              })}
            </>
          ) : (
            <span className="hidden lg:inline"> · {organizations.get(organizationId)}</span>
          )}
        </h2>
        {organizationId !== "all" && (
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
      {shown.length === 0 ? (
        <EmptyState message={t("list.noMatch")} />
      ) : (
        <div>
          <div
            aria-hidden
            className="hidden grid-cols-[minmax(0,1fr)_9rem_minmax(8rem,1fr)_1.25rem] gap-4 rounded-t-lg border bg-secondary px-4 py-3 text-sm font-medium lg:grid"
          >
            <span>{t("list.eventAndOrganization")}</span>
            <span>{t("list.statusColumn")}</span>
            <span>{t("list.occupancy")}</span>
          </div>
          <ul className="flex flex-col gap-2 lg:gap-0">
            {pageItems.map((event) => (
              // The event that was just created keeps the selected surface (O02a).
              <li
                key={event.id}
                data-created={event.id === createdEventId || undefined}
                className={cn(
                  "rounded-xl border border-border bg-card lg:rounded-none lg:border-t-0 lg:last:rounded-b-lg",
                  event.id === createdEventId && "bg-accent/60",
                )}
              >
                <EventRow event={event} />
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

/** One event: name, when and who, whether applications are open, how full it is. */
function EventRow({ event }: { event: OrganizerEvent }) {
  const { t } = useTranslation("events")

  return (
    <Link
      to={ROUTES.organizer.event}
      params={{ eventId: event.id }}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 px-3 py-3 transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-ring lg:grid-cols-[minmax(0,1fr)_9rem_minmax(8rem,1fr)_1.25rem] lg:items-center lg:px-4"
    >
      {/* Phone: organization above the name, then the dates; from `lg` the row reads name, then
          "organization · dates". */}
      <div className="col-span-2 flex min-w-0 flex-col gap-0.5 lg:col-span-1">
        <p className="text-sm text-muted-foreground lg:hidden">{event.organizationName}</p>
        <h3 className="text-base font-semibold wrap-anywhere lg:font-medium">{event.name}</h3>
        <p className="text-sm text-muted-foreground lg:hidden">
          {termsSummary(event, t, "header")}
        </p>
        <p className="hidden text-sm font-medium lg:block">{termsSummary(event, t)}</p>
        {event.location ? <p className="text-sm text-muted-foreground">{event.location}</p> : null}
      </div>
      <ChevronRight
        aria-hidden
        className="hidden size-5 text-muted-foreground lg:col-start-4 lg:row-start-1 lg:block"
      />
      <div className="col-start-2 row-start-2 self-start lg:row-start-1 lg:self-center">
        <Badge
          variant={event.applicationsOpen ? "default" : "warning"}
          className={event.applicationsOpen ? "bg-primary text-primary-foreground" : undefined}
        >
          {event.applicationsOpen ? t("list.statusOpen") : t("list.statusClosed")}
        </Badge>
      </div>
      <div className="col-start-1 row-start-2 flex min-w-0 flex-col gap-1 lg:col-start-3 lg:row-start-1 lg:gap-2">
        <Occupancy event={event} />
      </div>
    </Link>
  )
}

/** Confirmed of all beds across the terms ("152/160 potvrzených"), with a bar; a dash until there are terms and rooms. */
function Occupancy({ event }: { event: OrganizerEvent }) {
  const { t } = useTranslation("events")
  const confirmed = event.terms.reduce((sum, term) => sum + term.confirmedCount, 0)
  const capacity = event.terms.reduce((sum, term) => sum + term.capacity, 0)

  if (capacity === 0) {
    return <span className="text-sm font-medium">{t("list.noCapacity")}</span>
  }
  const label = t("list.occupancyConfirmed", { confirmed, capacity })

  return (
    <>
      <span className="text-sm font-medium tabular-nums">{label}</span>
      <Progress
        value={(confirmed / capacity) * 100}
        aria-label={label}
        className="w-full"
      />
    </>
  )
}
