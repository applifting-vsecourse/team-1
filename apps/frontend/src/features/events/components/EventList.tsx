import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import type { TFunction } from "i18next"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { ActiveCorners } from "@/components/atoms/ActiveCorners"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatDateRange, formatMonthRange } from "@/lib/date"

import { eventsQueryOptions, type OrganizerEvent } from "@/features/events/api/events"

/** O02 / O02a: the organizer's events as cards, with a confirmation right after one was created. */
// Figma (Design system): O02 Seznam akcí · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11988-91
// Figma (Design system): O02a Nová akce v seznamu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12264-1331
export function EventList({ createdEventId }: { createdEventId?: string }) {
  const { t } = useTranslation("events")
  const { data, isPending, error, refetch } = useQuery(eventsQueryOptions())
  const created = data?.find((event) => event.id === createdEventId)

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
      {created ? (
        <p
          role="status"
          className="rounded-lg border border-status-success bg-status-success-bg px-5 py-4 text-status-success"
        >
          {t("list.created", { name: created.name })}
        </p>
      ) : null}
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
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("list.count", { count: data.length })}
          </h2>
          <ul className="flex flex-col gap-4">
            {data.map((event) => (
              // The just-created event is the one current card: it carries the Togena corners.
              <li
                key={event.id}
                data-status={event.id === createdEventId ? "active" : undefined}
                className="group relative"
              >
                <EventCard event={event} />
                <ActiveCorners />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

/** One event as on the dashboard: name, when and who, whether applications are open, how full it is. */
// Figma (Design system): O01 Dashboard, karta akce · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11988-73
function EventCard({ event }: { event: OrganizerEvent }) {
  const { t } = useTranslation("events")

  return (
    <Link
      to={ROUTES.organizer.event}
      params={{ eventId: event.id }}
      className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Card className="gap-2 px-6 py-5 transition-colors hover:bg-accent/40">
        <div className="flex items-center justify-between gap-6">
          <h3 className="text-lg font-semibold">{event.name}</h3>
          <span
            aria-hidden
            className="shrink-0 text-lg font-semibold text-link"
          >
            →
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{termsSummary(event, t)}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
          <Badge variant={event.applicationsOpen ? "info" : "warning"}>
            {event.applicationsOpen ? t("list.statusOpen") : t("list.statusClosed")}
          </Badge>
          <Occupancy event={event} />
        </div>
      </Card>
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
      <span className="text-sm font-medium tabular-nums">{label}</span>
      <Progress
        value={(confirmed / capacity) * 100}
        aria-label={label}
        className="min-w-24 flex-1"
      />
    </>
  )
}

/** O01 / O02: one term shows its dates, several the count and the months they span. */
function termsSummary(event: OrganizerEvent, t: TFunction<"events">): string {
  const organization = event.organizationName
  if (event.termCount === 0 || !event.startsOn || !event.endsOn) {
    return t("list.noTerms", { organization })
  }
  if (event.termCount === 1) {
    return t("list.oneTerm", {
      dates: formatDateRange(event.startsOn, event.endsOn, { shouldShowYear: true }),
      organization,
    })
  }
  return t("list.manyTerms", {
    count: event.termCount,
    months: formatMonthRange(event.startsOn, event.endsOn),
    organization,
  })
}
