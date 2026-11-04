import { useEffect, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { FilterX } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Seo } from "@/components/atoms/Seo"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { notify } from "@/lib/notify"

import {
  applicationsQueryOptions,
  type ListedApplication,
} from "@/features/event-overview/api/applications"
import type { BulkDecision } from "@/features/event-overview/api/bulkDecision"
import { occupancyQueryOptions } from "@/features/event-overview/api/occupancy"
import { ApplicationFilters } from "@/features/event-overview/components/ApplicationFilters"
import { ApplicationViews } from "@/features/event-overview/components/ApplicationViews"
import { BulkConfirmDialog } from "@/features/event-overview/components/BulkConfirmDialog"
import { BulkDecisionDialog } from "@/features/event-overview/components/BulkDecisionDialog"
import { BulkSelectionBar } from "@/features/event-overview/components/BulkSelectionBar"
import {
  SubstituteOutcome,
  type SubstituteOutcomeData,
} from "@/features/event-overview/components/SubstituteOutcome"
import { SubstitutesPanel } from "@/features/event-overview/components/SubstitutesPanel"
import { UnfinishedEvent } from "@/features/event-overview/components/UnfinishedEvent"
import type { ApplicationsSearch } from "@/features/event-overview/lib/applications-search"

// Figma (Design system): O05, O05g · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12110-326
// Figma (Design system): O05 / Náhradníci (waitlist of a term and gender) · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12769-3721
// Figma (Design system): M12 · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14070-41596
// Figma (Design system): US-103 view chips + queue (ApplicationViews, ApplicationQueue) · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15765-4897
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
  const isQueue = filters.status === "TO_EVALUATE"
  const query = useQuery(applicationsQueryOptions(eventId, filters))
  const client = useQueryClient()
  const occupancy = useQuery(occupancyQueryOptions(eventId))
  const [page, setPage] = useState(0)
  // Deciding in bulk (US-107, US-108) works on one term: the free beds belong to a term. With a
  // single term there is no choice to make, so the filter "all terms" is that term.
  const terms = occupancy.data?.terms ?? []
  const bulkTerm = isQueue
    ? filters.term
      ? terms.find((term) => term.id === filters.term)
      : terms.length === 1
        ? terms[0]
        : undefined
    : undefined
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set())
  const [dialog, setDialog] = useState<"CONFIRM" | BulkDecision | null>(null)
  // Filling a freed bed (US-104) works on one term of the waitlist, like deciding in bulk.
  const [outcome, setOutcome] = useState<SubstituteOutcomeData | null>(null)
  const pageCount = Math.max(1, Math.ceil((query.data?.length ?? 0) / 20))
  const currentPage = Math.min(page, pageCount - 1)
  const visibleRows = query.data?.slice(currentPage * 20, (currentPage + 1) * 20) ?? []
  // Only what the filter shows counts, so narrowing the filter never decides on a hidden row.
  const selected = bulkTerm ? (query.data ?? []).filter((row) => selectedIds.has(row.id)) : []
  const isAllSelected = (query.data?.length ?? 0) > 0 && selected.length === query.data?.length
  const finishBulk = (
    message: "doneConfirmed" | "doneWaitlisted" | "doneRejected",
    { changed, unchanged }: BulkDone,
  ) => {
    setDialog(null)
    setSelectedIds(new Set())
    notify.success(
      t(`bulk.${message}`, { count: changed }),
      unchanged > 0 ? t("bulk.doneUnchanged", { count: unchanged }) : undefined,
    )
    void client.invalidateQueries({ queryKey: ["eventOverview"] })
    // Back to the list of all applications, where the new statuses show.
    const next = { ...filters }
    delete next.status
    setPage(0)
    onFiltersChange(next)
  }
  const hasFilters = Object.values(filters).some(Boolean)
  const isWaitlist = filters.status === "WAITLISTED"
  const substituteTerm = isWaitlist
    ? filters.term
      ? terms.find((term) => term.id === filters.term)
      : terms.length === 1
        ? terms[0]
        : undefined
    : undefined
  // Without a term or a room the event takes no applications yet; say what is missing instead.
  const isUnfinished =
    occupancy.data !== undefined &&
    (occupancy.data.terms.length === 0 ||
      occupancy.data.terms.every((term) => term.roomCount === 0))
  if (isUnfinished && !hasFilters && query.data?.length === 0) {
    return (
      <>
        <Seo title={t("applications.title")} />
        <UnfinishedEvent
          eventId={eventId}
          hasTerms={occupancy.data.terms.length > 0}
          hasRooms={occupancy.data.terms.some((term) => term.roomCount > 0)}
        />
      </>
    )
  }
  const views = (
    <ApplicationViews
      filters={filters}
      onChange={(next) => {
        setPage(0)
        setSelectedIds(new Set())
        setOutcome(null)
        onFiltersChange(next)
      }}
    />
  )
  if (outcome && isWaitlist) {
    return (
      <div className="flex flex-col gap-6">
        <Seo title={t("applications.title")} />
        {views}
        <SubstituteOutcome
          outcome={outcome}
          onBack={() => setOutcome(null)}
        />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("applications.title")} />
      {views}
      {substituteTerm && (
        <SubstitutesPanel
          eventId={eventId}
          term={substituteTerm}
          onOutcome={setOutcome}
        />
      )}
      <>
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
              <p className="text-sm text-muted-foreground">
                {t(
                  isQueue
                    ? "applications.sortQueue"
                    : isWaitlist && filters.term
                      ? "applications.sortWaitlist"
                      : "applications.sort",
                )}
              </p>
            </div>
            {isQueue && !bulkTerm && terms.length > 1 && query.data.length > 0 && (
              <p className="text-sm text-muted-foreground">{t("bulk.chooseTerm")}</p>
            )}
            {bulkTerm && query.data.length > 0 && (
              <div className="flex items-center gap-3">
                <Checkbox
                  id="applications-select-all"
                  className="size-6 rounded-md"
                  checked={isAllSelected}
                  onCheckedChange={(checked) =>
                    setSelectedIds(
                      checked === true
                        ? new Set((query.data ?? []).map((row) => row.id))
                        : new Set(),
                    )
                  }
                />
                <Label
                  htmlFor="applications-select-all"
                  className="text-base font-normal"
                >
                  {t("bulk.selectAll", { count: query.data.length })}
                </Label>
              </div>
            )}
            {query.data.length === 0 ? (
              <div className="flex flex-col items-start gap-4 py-6">
                <p className="text-sm text-muted-foreground">
                  {isQueue && !filters.q && !filters.term
                    ? t("queue.empty")
                    : t(hasFilters ? "applications.empty" : "applications.noApplications")}
                </p>
                {isQueue && !filters.q && !filters.term && (
                  <p className="text-sm text-muted-foreground">{t("queue.emptyHint")}</p>
                )}
                {hasFilters && !(isQueue && !filters.q && !filters.term) && (
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
                        {bulkTerm && (
                          <TableHead className="w-10">
                            <span className="sr-only">{t("bulk.selected")}</span>
                          </TableHead>
                        )}
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
                          {bulkTerm && (
                            <TableCell>
                              <SelectRow
                                row={row}
                                selectedIds={selectedIds}
                                onChange={setSelectedIds}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <p className="font-medium">
                              {row.firstName} {row.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(row.birthDate)} ·{" "}
                              {t(
                                row.gender === "FEMALE"
                                  ? "applications.female"
                                  : "applications.male",
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
                                {t(
                                  row.amountOwedCzk > 0 ? "payment.record" : "applications.detail",
                                )}
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
                    <div
                      key={row.id}
                      className="flex items-start gap-3"
                    >
                      {bulkTerm && (
                        <div className="pt-3">
                          <SelectRow
                            row={row}
                            selectedIds={selectedIds}
                            onChange={setSelectedIds}
                          />
                        </div>
                      )}
                      <Link
                        to={ROUTES.organizer.application}
                        params={{ eventId, applicationId: row.id }}
                        className="flex min-w-0 flex-1 flex-col gap-2 py-3"
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
                    </div>
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
                {bulkTerm && selected.length > 0 && (
                  <BulkSelectionBar
                    count={selected.length}
                    onConfirm={() => setDialog("CONFIRM")}
                    onDecide={setDialog}
                  />
                )}
              </>
            )}
          </section>
        )}
        {isWaitlist && (
          <Alert role="status">
            <AlertTitle className="line-clamp-none">
              {t("applications.waitlistNoteTitle")}
            </AlertTitle>
            <AlertDescription>{t("applications.waitlistNote")}</AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-muted-foreground">{t("applications.hint")}</p>
      </>
      {bulkTerm && dialog === "CONFIRM" && (
        <BulkConfirmDialog
          eventId={eventId}
          termId={bulkTerm.id}
          applications={selected}
          onClose={() => setDialog(null)}
          onDone={(result) => finishBulk("doneConfirmed", result)}
        />
      )}
      {bulkTerm && (dialog === "WAITLIST" || dialog === "REJECT") && (
        <BulkDecisionDialog
          eventId={eventId}
          termId={bulkTerm.id}
          decision={dialog}
          applications={selected}
          onClose={() => setDialog(null)}
          onDone={(result) =>
            finishBulk(dialog === "REJECT" ? "doneRejected" : "doneWaitlisted", result)
          }
        />
      )}
    </div>
  )
}

type BulkDone = { changed: number; unchanged: number }

function SelectRow({
  row,
  selectedIds,
  onChange,
}: {
  row: ListedApplication
  selectedIds: ReadonlySet<string>
  onChange: (ids: ReadonlySet<string>) => void
}) {
  const { t } = useTranslation("eventOverview")
  return (
    <Checkbox
      className="size-6 rounded-md"
      checked={selectedIds.has(row.id)}
      aria-label={t("bulk.selectRow", { name: `${row.firstName} ${row.lastName}` })}
      onCheckedChange={(checked) => {
        const next = new Set(selectedIds)
        if (checked === true) next.add(row.id)
        else next.delete(row.id)
        onChange(next)
      }}
    />
  )
}

// Each status has its own colour; the waitlist and the cancelled ones use tokens the badge has no variant for.
const STATUS_BADGE = {
  TO_EVALUATE: { variant: "warning", className: undefined },
  CONFIRMED: { variant: "success", className: undefined },
  WAITLISTED: { variant: "secondary", className: "bg-status-waitlist-bg text-status-waitlist" },
  CANCELLED: { variant: "secondary", className: "bg-destructive/10 text-destructive" },
} as const

const STATUS_LABEL = {
  TO_EVALUATE: "toEvaluate",
  CONFIRMED: "confirmed",
  WAITLISTED: "waitlisted",
  CANCELLED: "cancelled",
} as const

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
            variant={STATUS_BADGE[term.status].variant}
            className={STATUS_BADGE[term.status].className}
          >
            {term.status === "WAITLISTED" && term.waitlistPosition !== null
              ? t(
                  application.gender === "FEMALE"
                    ? "applications.waitlistedPositionFemale"
                    : "applications.waitlistedPositionMale",
                  { position: term.waitlistPosition },
                )
              : t(`applications.${STATUS_LABEL[term.status]}`)}
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
