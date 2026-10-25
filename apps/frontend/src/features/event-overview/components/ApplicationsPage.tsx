import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { FilterX } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Seo } from "@/components/atoms/Seo"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate, formatDateRange, formatDateTime } from "@/lib/date"

import {
  applicationsQueryOptions,
  type ListedApplication,
} from "@/features/event-overview/api/applications"
import { occupancyQueryOptions } from "@/features/event-overview/api/occupancy"
import { ApplicationFilters } from "@/features/event-overview/components/ApplicationFilters"
import type { ApplicationsSearch } from "@/features/event-overview/lib/applications-search"

// Figma (Design system): O05, O05g · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12110-326
// Figma (Design system): M12 · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14070-41596
// Figma (Design system): M12b / Empty results · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14189-43641
export function ApplicationsPage({
  eventId,
  filters,
  onFiltersChange,
}: {
  eventId: string
  filters: ApplicationsSearch
  onFiltersChange: (filters: ApplicationsSearch) => void
}) {
  const { t } = useTranslation("eventOverview")
  const searchInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (searchInput.current) searchInput.current.value = filters.q ?? ""
  }, [filters.q])
  const query = useQuery(applicationsQueryOptions(eventId, filters))
  const occupancy = useQuery(occupancyQueryOptions(eventId))
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil((query.data?.length ?? 0) / 20))
  const currentPage = Math.min(page, pageCount - 1)
  const visibleRows = query.data?.slice(currentPage * 20, (currentPage + 1) * 20) ?? []
  const hasFilters = Object.values(filters).some(Boolean)
  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("applications.title")} />
      <div className="flex flex-wrap items-end gap-2">
        <form
          role="search"
          aria-label={t("applications.search")}
          className="w-full md:w-auto"
          onSubmit={(event) => event.preventDefault()}
        >
          <Label
            className="sr-only"
            htmlFor="applications-search"
          >
            {t("applications.search")}
          </Label>
          <Input
            ref={searchInput}
            id="applications-search"
            name="q"
            type="search"
            maxLength={100}
            defaultValue={filters.q ?? ""}
            placeholder={t("applications.searchPlaceholder")}
            className="w-full md:w-80"
            onChange={(event) => {
              setPage(0)
              const q = event.target.value.trim()
              onFiltersChange({ ...filters, q: q === "" ? undefined : q })
            }}
          />
        </form>
        <ApplicationFilters
          filters={filters}
          terms={(occupancy.data?.terms ?? []).map((term) => ({
            id: term.id,
            name: formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true }),
          }))}
          onChange={(next) => {
            setPage(0)
            onFiltersChange(next)
          }}
        />
      </div>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState
          title={t("applications.error")}
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <section
          aria-busy={query.isFetching}
          className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm md:p-6"
        >
          <div className="flex flex-wrap justify-between gap-2">
            <h2 className="text-lg font-semibold">
              {t("applications.count", { count: query.data.length })}
            </h2>
            <p className="text-sm text-muted-foreground">{t("applications.sort")}</p>
          </div>
          {query.data.length === 0 ? (
            <div className="flex flex-col items-start gap-4 py-6">
              <p className="text-sm text-muted-foreground">
                {t(hasFilters ? "applications.empty" : "applications.noApplications")}
              </p>
              {hasFilters && (
                <Button
                  variant="secondary"
                  size="lg"
                  className="h-auto min-h-11 cursor-pointer border border-border whitespace-normal transition-colors hover:border-input hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent active:border-primary active:bg-accent/80"
                  onClick={() => {
                    setPage(0)
                    onFiltersChange({})
                    searchInput.current?.focus()
                  }}
                >
                  <FilterX
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                  {t("applications.clearSearchAndFilters")}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {(
                        [
                          "participant",
                          "terms",
                          "payment",
                          "due",
                          "owed",
                          "submitted",
                          "actions",
                        ] as const
                      ).map((key) => (
                        <TableHead key={key}>{t(`applications.${key}`)}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <p className="font-medium">
                            {row.firstName} {row.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(row.birthDate)} ·{" "}
                            {t(
                              row.gender === "FEMALE" ? "applications.female" : "applications.male",
                            )}{" "}
                            · {row.email}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Terms application={row} />
                        </TableCell>
                        <TableCell>
                          <PaymentStatus application={row} />
                        </TableCell>
                        <TableCell>
                          <MoneyAmount amountCzk={row.amountDueCzk} />
                        </TableCell>
                        <TableCell>
                          <MoneyAmount amountCzk={row.amountOwedCzk} />
                        </TableCell>
                        <TableCell>{formatDateTime(row.submittedAt)}</TableCell>
                        <TableCell>
                          <Button
                            asChild
                            variant="ghost"
                          >
                            <Link
                              to={ROUTES.organizer.application}
                              params={{ eventId, applicationId: row.id }}
                            >
                              {t("payment.record")}
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="divide-y md:hidden">
                {visibleRows.map((row) => (
                  <Link
                    key={row.id}
                    to={ROUTES.organizer.application}
                    params={{ eventId, applicationId: row.id }}
                    className="flex flex-col gap-2 py-3"
                  >
                    <span className="font-medium">
                      {row.firstName} {row.lastName}
                    </span>
                    <span className="text-xs wrap-anywhere text-muted-foreground">
                      {formatDate(row.birthDate)} ·{" "}
                      {t(row.gender === "FEMALE" ? "applications.female" : "applications.male")}
                      {" · "}
                      {row.email}
                    </span>
                    <Terms application={row} />
                    <PaymentStatus application={row} />
                  </Link>
                ))}
              </div>
              {pageCount > 1 && (
                <nav
                  aria-label={t("applications.pagination")}
                  className="flex flex-wrap items-center justify-end gap-4"
                >
                  <span className="text-sm text-muted-foreground">
                    {t("applications.range", {
                      from: currentPage * 20 + 1,
                      to: Math.min((currentPage + 1) * 20, query.data.length),
                      count: query.data.length,
                    })}
                  </span>
                  <Button
                    variant="ghost"
                    disabled={currentPage === 0}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    {t("applications.previous")}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={currentPage + 1 === pageCount}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    {t("applications.next")}
                  </Button>
                </nav>
              )}
            </>
          )}
        </section>
      )}
      <p className="text-sm text-muted-foreground">{t("applications.hint")}</p>
    </div>
  )
}

function Terms({ application }: { application: ListedApplication }) {
  const { t } = useTranslation("eventOverview")
  return (
    <div className="flex flex-col gap-2">
      {application.terms.map((term) => (
        <div
          key={term.id}
          className="flex flex-wrap items-center gap-2"
        >
          <span>{formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}</span>
          <Badge
            variant={term.status === "CONFIRMED" ? "success" : "secondary"}
            className={
              term.status === "WAITLISTED"
                ? "bg-status-waitlist-bg text-status-waitlist"
                : undefined
            }
          >
            {t(term.status === "CONFIRMED" ? "applications.confirmed" : "applications.waitlisted")}
          </Badge>
        </div>
      ))}
    </div>
  )
}
function PaymentStatus({ application }: { application: ListedApplication }) {
  const { t } = useTranslation("eventOverview")
  const labels = {
    NOTHING_DUE: "nothingDue",
    UNPAID: "unpaid",
    PARTIALLY_PAID: "partial",
    PAID: "paid",
    OVERPAID: "overpaid",
  } as const
  return (
    <Badge
      variant={
        application.paymentStatus === "PAID"
          ? "success"
          : application.paymentStatus === "PARTIALLY_PAID" ||
              application.paymentStatus === "OVERPAID"
            ? "warning"
            : "secondary"
      }
    >
      {t(`applications.${labels[application.paymentStatus]}`)}
    </Badge>
  )
}
