import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { ActiveCorners } from "@/components/atoms/ActiveCorners"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { TermLabel } from "@/components/molecules/TermLabel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import {
  eventsQueryOptions,
  type EventTermSummary,
  type OrganizerEvent,
} from "@/features/events/api/events"

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

/** One event: name, organization, whether the application link works, every term with its occupancy. */
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
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-sm text-muted-foreground">{event.organizationName}</p>
          <Badge variant={event.applicationsOpen ? "success" : "warning"}>
            {event.applicationsOpen ? t("list.statusOpen") : t("list.statusClosed")}
          </Badge>
        </div>
        {/* Rows: "O / Event term row" https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13895-8174 */}
        <ul className="pt-2">
          {event.terms.map((term) => (
            <li
              key={term.id}
              className="flex items-center gap-4 border-t py-3"
            >
              <TermLabel term={term} />
              <Occupancy term={term} />
            </li>
          ))}
          {event.terms.length === 0 ? (
            <li className="flex items-center gap-4 border-t py-3 text-sm font-medium">
              <span className="flex-1">{t("list.noTerms")}</span>
              <span>{t("list.noCapacity")}</span>
            </li>
          ) : null}
        </ul>
      </Card>
    </Link>
  )
}

/** Confirmed places of all beds; a dash until the event has rooms. */
function Occupancy({ term }: { term: EventTermSummary }) {
  const { t } = useTranslation("events")

  return (
    <span className="shrink-0 text-sm font-medium tabular-nums">
      {term.capacity > 0
        ? t("list.occupancy", { confirmed: term.confirmedCount, count: term.capacity })
        : t("list.noCapacity")}
    </span>
  )
}
