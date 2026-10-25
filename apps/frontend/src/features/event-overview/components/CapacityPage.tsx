import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { CapacityProgress } from "@/components/atoms/CapacityProgress"
import { Seo } from "@/components/atoms/Seo"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { TermLabel } from "@/components/molecules/TermLabel"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatDateRange } from "@/lib/date"

import { occupancyQueryOptions, type TermOccupancy } from "@/features/event-overview/api/occupancy"

// Figma: O08d · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12768-3229
export function CapacityPage({ eventId, termId }: { eventId: string; termId?: string }) {
  const { t } = useTranslation("eventOverview")
  const query = useQuery(occupancyQueryOptions(eventId))
  const selected = query.data?.terms.find((term) => term.id === termId)
  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("capacity.title")} />
      {termId && (
        <BackLink
          to={ROUTES.organizer.eventCapacity}
          params={{ eventId }}
          search={{}}
        >
          {t("capacity.back")}
        </BackLink>
      )}
      <SectionHeader
        title={selected?.name ?? t("capacity.title")}
        description={
          selected
            ? formatDateRange(selected.startsOn, selected.endsOn, { shouldShowYear: true })
            : t("capacity.description")
        }
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
          onRetry={() => void query.refetch()}
        />
      ) : !query.data ? (
        <LoadingState />
      ) : termId ? (
        selected ? (
          <SharedTermCapacity
            eventId={eventId}
            term={selected}
          />
        ) : (
          <EmptyState message={t("capacity.termNotFound")} />
        )
      ) : query.data.terms.length === 0 ? (
        <EmptyState message={t("capacity.empty")} />
      ) : (
        <TermList
          eventId={eventId}
          terms={query.data.terms}
        />
      )}
      {query.data && query.data.terms.length > 0 && (
        <p className="text-sm text-muted-foreground">{t("capacity.sharedNote")}</p>
      )}
    </div>
  )
}

function TermList({ eventId, terms }: { eventId: string; terms: TermOccupancy[] }) {
  const { t } = useTranslation("eventOverview")
  const columns = "lg:grid-cols-[minmax(0,1fr)_20rem_7rem_7rem]"
  return (
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
              className="border-b last:border-b-0"
            >
              <Link
                to={ROUTES.organizer.eventCapacity}
                params={{ eventId }}
                search={{ termId: term.id }}
                className={`grid min-h-14 grid-cols-2 items-center gap-x-4 gap-y-2 rounded-md px-3 py-3 text-sm transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring lg:py-2 ${columns}`}
              >
                <div className="col-span-2 lg:col-span-1">
                  <TermLabel term={term} />
                </div>
                <div className="col-span-2 flex min-w-0 items-center gap-2 lg:col-span-1">
                  <CapacityProgress
                    confirmed={term.confirmed}
                    capacity={term.capacity}
                    label={t("capacity.confirmedColumn")}
                    className="max-w-40 flex-1"
                  />
                  <span className="shrink-0 font-medium tabular-nums">
                    {term.confirmed} / {term.capacity}
                  </span>
                </div>
                <div className="flex justify-between gap-2 lg:justify-end">
                  <span className="text-muted-foreground lg:sr-only">
                    {t("capacity.freeColumn")}
                  </span>
                  <span
                    className={`font-semibold tabular-nums ${term.free < 0 ? "text-destructive" : ""}`}
                  >
                    {term.free}
                  </span>
                </div>
                <div className="flex justify-between gap-2 lg:justify-end">
                  <span className="text-muted-foreground lg:sr-only">
                    {t("capacity.waitlistedColumn")}
                  </span>
                  <span className="tabular-nums">{term.waitlisted}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function SharedTermCapacity({ eventId, term }: { eventId: string; term: TermOccupancy }) {
  const { t } = useTranslation("eventOverview")
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <h3 className="text-sm text-muted-foreground">{t("capacity.confirmedColumn")}</h3>
          <p className="text-3xl font-bold tabular-nums">
            <Link
              to={ROUTES.organizer.eventApplications}
              params={{ eventId }}
              search={{ term: term.id, status: "CONFIRMED" }}
              className="text-link underline"
            >
              {term.confirmed}
            </Link>{" "}
            / {term.capacity}
          </p>
          <CapacityProgress
            confirmed={term.confirmed}
            capacity={term.capacity}
            label={t("capacity.confirmedColumn")}
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-3">
          <h3 className="text-sm text-muted-foreground">{t("capacity.freeColumn")}</h3>
          <p
            className={`text-3xl font-bold tabular-nums ${term.free < 0 ? "text-destructive" : ""}`}
          >
            {term.free}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-3">
          <h3 className="text-sm text-muted-foreground">{t("capacity.waitlistedColumn")}</h3>
          <Link
            to={ROUTES.organizer.eventApplications}
            params={{ eventId }}
            search={{ term: term.id, status: "WAITLISTED" }}
            className="text-3xl font-bold text-link tabular-nums underline"
          >
            {term.waitlisted}
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
