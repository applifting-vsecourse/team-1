import { useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ChevronRight, Search, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { LogoSymbol } from "@/components/atoms/Logo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatDateRange, formatTime } from "@/lib/date"

import {
  applicationsQueryOptions,
  type ListedApplication,
} from "@/features/event-overview/api/applications"
import type { ApplicationsSearch } from "@/features/event-overview/lib/applications-search"

// Figma (Design system): US-103 Přihlášky · Fronta od nejstarších · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15765-4897 (mobile 15765-5018)
// Figma (Design system): US-103 Přihlášky · Chyba fronty · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15765-5561 (mobile 15765-5636)
// Figma (Design system): US-103 Přihlášky · Filtr termínu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15765-5112 (mobile 15765-5231)
// Figma (Design system): US-103 Přihlášky · Fronta prázdná · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15765-5323 (mobile 15765-5391)
// Figma (Design system): US-103 Přihlášky · Načítání fronty · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15765-5432 (mobile 15765-5510)
export function ApplicationQueue({
  eventId,
  filters,
  terms,
  onFiltersChange,
}: {
  eventId: string
  filters: ApplicationsSearch
  terms: { id: string; startsOn: string; endsOn: string }[]
  onFiltersChange: (filters: ApplicationsSearch) => void
}) {
  const { t } = useTranslation("eventOverview")
  const searchInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (searchInput.current) searchInput.current.value = filters.q ?? ""
  }, [filters.q])
  const query = useQuery(applicationsQueryOptions(eventId, filters))
  return (
    <>
      <p>{t("queue.sortHint")}</p>
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <form
          role="search"
          aria-label={t("queue.search")}
          className="relative md:w-80"
          onSubmit={(event) => event.preventDefault()}
        >
          <Label
            className="sr-only"
            htmlFor="queue-search"
          >
            {t("queue.search")}
          </Label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-3 left-4 size-5 text-muted-foreground"
          />
          <Input
            ref={searchInput}
            id="queue-search"
            name="q"
            type="search"
            maxLength={100}
            defaultValue={filters.q ?? ""}
            placeholder={t("queue.search")}
            className="pl-12"
            onChange={(event) => {
              const q = event.target.value.trim()
              onFiltersChange({ ...filters, q: q === "" ? undefined : q })
            }}
          />
        </form>
        <div className="flex min-w-0 flex-col gap-2 md:flex-1">
          <Label htmlFor="queue-term">{t("applications.term")}</Label>
          <Select
            value={filters.term ?? "all"}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, term: value === "all" ? undefined : value })
            }
          >
            <SelectTrigger
              id="queue-term"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("applications.allTerms")}</SelectItem>
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
        </div>
      </div>
      {query.isPending ? (
        <div
          role="status"
          className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm"
        >
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="flex items-center gap-3"
              aria-hidden="true"
            >
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">{t("queue.loading")}</p>
        </div>
      ) : query.isError ? (
        <div className="flex flex-col gap-4">
          <Alert variant="destructive">
            <TriangleAlert aria-hidden="true" />
            <AlertTitle className="line-clamp-none">{t("queue.error")}</AlertTitle>
            <AlertDescription>{t("queue.errorHint")}</AlertDescription>
          </Alert>
          <Button
            size="lg"
            onClick={() => void query.refetch()}
          >
            {t("queue.retry")}
          </Button>
        </div>
      ) : query.data.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          {filters.q ? (
            <p className="text-sm text-muted-foreground">{t("applications.empty")}</p>
          ) : (
            <>
              <LogoSymbol className="size-8 text-primary" />
              <h2 className="text-2xl font-semibold tracking-tight">{t("queue.empty")}</h2>
              <p className="text-sm text-muted-foreground">{t("queue.emptyHint")}</p>
            </>
          )}
        </div>
      ) : (
        <ul
          aria-busy={query.isFetching}
          className="flex flex-col gap-4"
        >
          {query.data.map((row) => (
            <li key={row.id}>
              <QueueRow
                eventId={eventId}
                application={row}
                termId={filters.term}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function QueueRow({
  eventId,
  application,
  termId,
}: {
  eventId: string
  application: ListedApplication
  termId: string | undefined
}) {
  const { t } = useTranslation("eventOverview")
  const waiting = application.terms.filter(
    (term) => term.status === "TO_EVALUATE" && (!termId || term.id === termId),
  )
  return (
    <Link
      to={ROUTES.organizer.application}
      params={{ eventId, applicationId: application.id }}
      aria-label={`${t("queue.detail")}: ${application.firstName} ${application.lastName}`}
      className="group relative flex flex-col gap-4 rounded-lg border bg-card p-4 pr-14 shadow-sm transition-colors outline-none hover:border-primary focus-visible:ring-2 focus-visible:ring-ring md:grid md:grid-cols-[13rem_1fr] md:gap-4"
    >
      <div className="flex flex-col gap-2">
        <p>
          {application.firstName} {application.lastName}
        </p>
        <div className="hidden flex-col gap-2 text-sm md:flex">
          <p>
            {formatDate(application.birthDate)} ·{" "}
            {t(application.gender === "FEMALE" ? "applications.female" : "applications.male")}
          </p>
          <p className="wrap-anywhere">{application.email}</p>
          <p>
            {t("queue.received", {
              date: formatDate(application.submittedAt),
              time: formatTime(application.submittedAt),
            })}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 md:gap-4">
        {waiting.map((term) => (
          <div
            key={term.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 md:flex-col md:items-start md:gap-2"
          >
            <span>{formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}</span>
            <Badge variant="secondary">{t("queue.status")}</Badge>
          </div>
        ))}
      </div>
      <ChevronRight
        aria-hidden="true"
        className="absolute top-4 right-4 size-5 text-muted-foreground transition-colors group-hover:text-foreground"
      />
    </Link>
  )
}
