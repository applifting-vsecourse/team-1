import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import type { TFunction } from "i18next"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateRange, formatMonthRange } from "@/lib/date"
import { cn } from "@/lib/utils"

import { eventsQueryOptions, type OrganizerEvent } from "@/features/events/api/events"

/** O02a: the organizer's events, with a confirmation right after one was created. */
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
        <Card className="gap-4 p-6">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("list.count", { count: data.length })}
          </h2>
          <div
            aria-hidden
            className="hidden gap-4 text-sm font-medium text-muted-foreground md:grid md:grid-cols-[2fr_2fr_1fr_1fr_1.5rem]"
          >
            <span>{t("list.columns.event")}</span>
            <span>{t("list.columns.terms")}</span>
            <span>{t("list.columns.capacity")}</span>
            <span>{t("list.columns.status")}</span>
            <span />
          </div>
          <ul className="flex flex-col gap-3">
            {data.map((event) => (
              <li key={event.id}>
                <EventRow
                  event={event}
                  isHighlighted={event.id === createdEventId}
                />
              </li>
            ))}
          </ul>
          <p className="text-xs font-medium text-muted-foreground">
            {t("list.total", { count: data.length })}
          </p>
        </Card>
      ) : null}
    </div>
  )
}

function EventRow({ event, isHighlighted }: { event: OrganizerEvent; isHighlighted: boolean }) {
  const { t } = useTranslation("events")
  const terms = termsSummary(event, t)

  return (
    <Link
      to={ROUTES.organizer.event}
      params={{ eventId: event.id }}
      className={cn(
        "grid gap-1 rounded-md border p-3 text-sm md:grid-cols-[2fr_2fr_1fr_1fr_1.5rem] md:items-center md:gap-4",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        isHighlighted
          ? "min-h-16 border-transparent bg-accent"
          : "min-h-13 bg-card hover:bg-accent/40",
      )}
    >
      <span className="text-lg font-semibold tracking-tight text-link">{event.name}</span>
      <span>{terms}</span>
      <span>{t("list.noCapacity")}</span>
      <span className="font-medium text-link">
        {event.applicationsOpen ? t("list.statusOpen") : t("list.statusClosed")}
      </span>
      <span
        aria-hidden
        className="hidden text-lg font-semibold text-link md:block"
      >
        →
      </span>
    </Link>
  )
}

/** Frame O02a: one term shows its dates, several show the count and the months they span. */
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
