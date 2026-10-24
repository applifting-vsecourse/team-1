import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import { eventsQueryOptions, type OrganizerEvent } from "@/features/events/api/events"
import { termsSummary } from "@/features/events/lib/terms-summary"

/**
 * O02 / O02a: the organizer's events as rows with a toolbar to search and filter them; the event
 * that was just created is highlighted (the toast comes from the form).
 */
// Figma (Design system): O02 Seznam akcí · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11988-91
// Figma (Design system): O02a Nová akce v seznamu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12264-1331
export function EventList({ createdEventId }: { createdEventId?: string }) {
  const { t } = useTranslation("events")
  const { data, isPending, error, refetch } = useQuery(eventsQueryOptions())

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("list.title")}
        description={t("list.description")}
        actions={
          <Button
            asChild
            size="lg"
          >
            <Link to={ROUTES.organizer.newEvent}>{t("list.create")}</Link>
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
      {data && data.length === 0 ? <EmptyState message={t("list.empty")} /> : null}
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
  const organizations = [...new Map(events.map((e) => [e.organizationId, e.organizationName]))]

  const needle = query.trim().toLocaleLowerCase()
  const shown = events.filter(
    (event) =>
      (!needle || event.name.toLocaleLowerCase().includes(needle)) &&
      (status === "all" || event.applicationsOpen === (status === "open")) &&
      (organizationId === "all" || event.organizationId === organizationId),
  )

  return (
    <Card className="gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("list.search")}
          aria-label={t("list.search")}
          className="md:w-80"
        />
        <div className="grid grid-cols-2 gap-3 md:flex">
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as StatusFilter)}
          >
            <SelectTrigger
              aria-label={t("list.statusFilter")}
              className="w-full md:w-48"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("list.statusAll")}</SelectItem>
              <SelectItem value="open">{t("list.statusOpen")}</SelectItem>
              <SelectItem value="closed">{t("list.statusClosed")}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={organizationId}
            onValueChange={setOrganizationId}
          >
            <SelectTrigger
              aria-label={t("list.organizationFilter")}
              className="w-full md:w-60"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("list.organizationAll")}</SelectItem>
              {organizations.map(([id, name]) => (
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
        <p className="text-sm text-muted-foreground md:ml-auto">
          {t("list.count", { count: shown.length })}
        </p>
      </div>
      {shown.length === 0 ? (
        <EmptyState message={t("list.noMatch")} />
      ) : (
        <ul className="flex flex-col">
          {shown.map((event) => (
            // The event that was just created keeps the selected surface (O02a).
            <li
              key={event.id}
              data-created={event.id === createdEventId || undefined}
              className={cn(
                "border-b last:border-b-0",
                event.id === createdEventId && "bg-accent/60",
              )}
            >
              <EventRow event={event} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/** One event: name, when and who, whether applications are open, how full it is. */
function EventRow({ event }: { event: OrganizerEvent }) {
  const { t } = useTranslation("events")

  return (
    <Link
      to={ROUTES.organizer.event}
      params={{ eventId: event.id }}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-3 py-3 transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:grid-cols-[minmax(0,1fr)_12rem_20rem_auto]"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 className="font-medium">{event.name}</h3>
        <p className="text-xs text-muted-foreground">{termsSummary(event, t)}</p>
      </div>
      <ChevronRight
        aria-hidden
        className="col-start-2 row-span-3 row-start-1 size-5 text-muted-foreground md:col-start-4 md:row-span-1"
      />
      <div className="md:col-start-2 md:row-start-1">
        <Badge variant={event.applicationsOpen ? "info" : "warning"}>
          {event.applicationsOpen ? t("list.statusOpen") : t("list.statusClosed")}
        </Badge>
      </div>
      <div className="flex items-center gap-3 md:col-start-3 md:row-start-1">
        <Occupancy event={event} />
      </div>
    </Link>
  )
}

/** Confirmed of all beds across the terms, with a bar; a dash until there are terms and rooms. */
function Occupancy({ event }: { event: OrganizerEvent }) {
  const { t } = useTranslation("events")
  const confirmed = event.terms.reduce((sum, term) => sum + term.confirmedCount, 0)
  const capacity = event.terms.reduce((sum, term) => sum + term.capacity, 0)

  if (capacity === 0) {
    return <span className="text-sm font-medium">{t("list.noCapacity")}</span>
  }
  const label =
    event.terms.length === 1
      ? t("list.occupancyOne", { confirmed, capacity })
      : t("list.occupancyMany", { confirmed, capacity, count: event.terms.length })

  return (
    <>
      <Progress
        value={(confirmed / capacity) * 100}
        aria-label={label}
        className="w-24 shrink-0"
      />
      <span className="text-sm font-medium tabular-nums">{label}</span>
    </>
  )
}
