import { useEffect, useId, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { BedDouble, FilterX, Plus, Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Seo } from "@/components/atoms/Seo"
import { ErrorState } from "@/components/molecules/ErrorState"
import { ListSkeleton } from "@/components/molecules/ListSkeleton"
import { Pagination } from "@/components/molecules/Pagination"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
import { useConnectionFeedback } from "@/hooks/useConnectionFeedback"
import { PAGE_SIZE } from "@/hooks/usePagination"
import { formatDate, formatDateRange, formatDateTime } from "@/lib/date"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"

import {
  applicationsQueryOptions,
  type ListedApplication,
} from "@/features/event-overview/api/applications"
import type { BulkDecision } from "@/features/event-overview/api/bulkDecision"
import type { BulkEvaluationResult } from "@/features/event-overview/api/bulkEvaluation"
import { occupancyQueryOptions, type TermOccupancy } from "@/features/event-overview/api/occupancy"
import { ApplicationFilters } from "@/features/event-overview/components/ApplicationFilters"
import { ApplicationViews } from "@/features/event-overview/components/ApplicationViews"
import { BulkConfirmDialog } from "@/features/event-overview/components/BulkConfirmDialog"
import { BulkDecisionDialog } from "@/features/event-overview/components/BulkDecisionDialog"
import { BulkEvaluateDialog } from "@/features/event-overview/components/BulkEvaluateDialog"
import { BulkSelectionBar } from "@/features/event-overview/components/BulkSelectionBar"
import { ChangeRequestsPanel } from "@/features/event-overview/components/ChangeRequestsPanel"
import { SubstituteHistory } from "@/features/event-overview/components/SubstituteHistory"
import {
  SubstitutesPanel,
  type SubstituteTaken as SubstituteTakenData,
} from "@/features/event-overview/components/SubstitutesPanel"
import { SubstituteTaken } from "@/features/event-overview/components/SubstituteTaken"
import { UnfinishedEvent } from "@/features/event-overview/components/UnfinishedEvent"
import type { ApplicationsSearch } from "@/features/event-overview/lib/applications-search"

// Figma v2: US-52 Přihlášky · Seznam přihlášek · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15628-3232 (mobile 15628-3407); empty 15628-3783 (mobile 15628-3874)
// Figma v2: US-30 Pořadník · Dámská skupina · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19316-26503 (mobile 19316-26798)
// Figma v2: US-103 view chips + queue (ApplicationViews, ApplicationQueue) · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15765-4897 (mobile 15765-5018)
// Figma (Design system): US-38 badge in the row, empty filter · desktop https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=25587-109569 (mobile: 25587-109801); empty 25587-110253 (mobile: 25587-110406)
export function ApplicationsPage({
  eventId,
  isAutomatic = false,
  filters: search,
  onFiltersChange,
}: {
  eventId: string
  isAutomatic?: boolean
  filters: ApplicationsSearch
  /** `isPush`: a new history entry (turning the page); filters replace the current one. */
  onFiltersChange: (filters: ApplicationsSearch, options?: { isPush?: boolean }) => void
}) {
  // The page is in the URL (1-based, absent for the first), apart from the filters: changing a
  // filter builds the next search from `filters`, so it drops the page and returns to the first.
  const { page: urlPage, ...filters } = search
  useConnectionFeedback()
  const { t } = useTranslation("eventOverview")
  const searchInput = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  useEffect(() => {
    if (searchInput.current) searchInput.current.value = filters.q ?? ""
  }, [filters.q])
  const isQueue = filters.status === "TO_EVALUATE"
  const query = useQuery(applicationsQueryOptions(eventId, filters))
  const client = useQueryClient()
  const occupancy = useQuery(occupancyQueryOptions(eventId))
  const page = (urlPage ?? 1) - 1
  const setPage = (index: number) =>
    onFiltersChange({ ...filters, page: index > 0 ? index + 1 : undefined }, { isPush: true })
  // Deciding in bulk (US-107, US-108) works on one term: the free beds belong to a term. With a
  // single term there is no choice to make, so the filter "all terms" is that term.
  const terms = occupancy.data?.terms ?? []
  // US-27 / 19088:23988, 19088:24305, 19088:24704, 19088:25013.
  const automaticTerm =
    isAutomatic && !filters.status && !filters.view
      ? terms.find((term) => term.id === filters.term)
      : undefined
  const bulkTerm = isQueue
    ? filters.term
      ? terms.find((term) => term.id === filters.term)
      : terms.length === 1
        ? terms[0]
        : undefined
    : undefined
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set())
  const [dialog, setDialog] = useState<"CONFIRM" | "EVALUATE" | BulkDecision | null>(null)
  // Filling a freed bed (US-104) works on one term of the waitlist, like deciding in bulk.
  const [taken, setTaken] = useState<SubstituteTakenData | null>(null)
  const pageCount = Math.max(1, Math.ceil((query.data?.length ?? 0) / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  // A page past the end (rows deleted, an old link) falls back to the last one that exists.
  const isPastEnd = query.data !== undefined && page > currentPage
  useEffect(() => {
    if (isPastEnd) {
      onFiltersChange(
        { ...filters, page: currentPage > 0 ? currentPage + 1 : undefined },
        { isPush: false },
      )
    }
  })
  // The general list arrives newest first, with the application number breaking ties.
  const orderedRows = automaticTerm ? query.data?.toReversed() : query.data
  const visibleRows =
    orderedRows?.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE) ?? []
  // Only what the filter shows counts, so narrowing the filter never decides on a hidden row.
  const selected = bulkTerm ? (query.data ?? []).filter((row) => selectedIds.has(row.id)) : []
  const isAllSelected = (query.data?.length ?? 0) > 0 && selected.length === query.data?.length
  const leaveBulk = (title: string, description?: string) => {
    setDialog(null)
    setSelectedIds(new Set())
    notify.success(title, description)
    void client.invalidateQueries({ queryKey: ["eventOverview"] })
    // Back to the list of all applications, where the new statuses show.
    const next = { ...filters }
    delete next.status
    onFiltersChange(next)
  }
  const finishBulk = (
    message: "doneConfirmed" | "doneWaitlisted" | "doneRejected",
    { changed, unchanged }: BulkDone,
  ) =>
    leaveBulk(
      t(`bulk.${message}`, { count: changed }),
      unchanged > 0 ? t("bulk.doneUnchanged", { count: unchanged }) : undefined,
    )
  const finishEvaluation = ({ confirmed, waitlisted, rejected }: BulkEvaluationResult) => {
    const restCount = waitlisted.length + rejected.length
    const confirmedText = t("bulkEvaluation.doneConfirmed", { count: confirmed.length })
    const restText =
      rejected.length > 0
        ? t("bulkEvaluation.doneRejected", { count: rejected.length })
        : t("bulkEvaluation.doneSubstitutes", { count: waitlisted.length })
    leaveBulk(
      t("bulkEvaluation.doneTitle", { count: confirmed.length + restCount }),
      restCount > 0
        ? t("bulkEvaluation.doneSplit", { confirmed: confirmedText, rest: restText })
        : confirmedText,
    )
  }
  const hasFilters = Object.values(filters).some(Boolean)
  // Only the filter of individual accommodation is set: nobody has asked for it (US-38).
  const isOnlyIndividual =
    filters.accommodation === "INDIVIDUAL" &&
    Object.entries(filters).every(([key, value]) => !value || key === "accommodation")
  const isWaitlist = filters.status === "WAITLISTED"
  const isStatusLocked = isQueue || isWaitlist
  const hasRemovableFilters = Object.entries(filters).some(
    ([key, value]) => Boolean(value) && !(key === "status" && isStatusLocked),
  )
  const clearFilters = () => {
    if (filters.term) setSelectedIds(new Set())
    onFiltersChange(isStatusLocked ? { status: filters.status } : {})
  }
  const clearEmptySearch = () => {
    clearFilters()
    searchInput.current?.focus()
  }
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
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold">
        {t(
          automaticTerm
            ? "automaticCapacity.heading"
            : isWaitlist
              ? "applications.waitlistTitle"
              : "applications.title",
        )}
      </h2>
      <ApplicationViews
        eventId={eventId}
        filters={filters}
        onChange={(next) => {
          setSelectedIds(new Set())
          setTaken(null)
          onFiltersChange(next)
        }}
      />
    </div>
  )
  if (filters.view === "CHANGE_REQUESTS") {
    return (
      <div className="flex flex-col gap-6">
        <Seo title={t("applications.title")} />
        {views}
        <ChangeRequestsPanel eventId={eventId} />
      </div>
    )
  }
  if (taken && isWaitlist) {
    return (
      <div className="flex flex-col gap-6">
        <Seo title={t("applications.title")} />
        {views}
        <SubstituteTaken
          {...taken}
          onRefresh={() => {
            void occupancy.refetch()
            setTaken(null)
          }}
        />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("applications.title")} />
      {views}
      {automaticTerm ? <AutomaticCapacity term={automaticTerm} /> : null}
      <Button
        asChild
        size="lg"
        className="self-start"
      >
        <Link
          to={ROUTES.organizer.newApplication}
          params={{ eventId }}
        >
          <Plus className="size-4" />
          {t("manual.add")}
        </Link>
      </Button>
      {substituteTerm && (
        <SubstitutesPanel
          hasWaitlistedParticipants={(query.data?.length ?? 0) > 0}
          eventId={eventId}
          term={substituteTerm}
          onTaken={setTaken}
          onConfirmed={(applicationId) => {
            void client.invalidateQueries({ queryKey: occupancyQueryOptions(eventId).queryKey })
            notify.success(t("substitutes.confirmed"))
            // The application of the confirmed participant, where the payment details are.
            void navigate({ to: ROUTES.organizer.application, params: { eventId, applicationId } })
          }}
        />
      )}
      {substituteTerm && (
        <SubstituteHistory
          eventId={eventId}
          term={substituteTerm}
        />
      )}
      <>
        <div className="flex flex-wrap items-end gap-2">
          <form
            id="term-waitlist"
            role="search"
            aria-label={t("applications.search")}
            className="relative w-full md:w-auto"
            onSubmit={(event) => event.preventDefault()}
          >
            <Label
              className="sr-only"
              htmlFor="applications-search"
            >
              {t("applications.search")}
            </Label>
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-[17px] size-5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              ref={searchInput}
              id="applications-search"
              name="q"
              type="search"
              maxLength={100}
              defaultValue={filters.q ?? ""}
              placeholder={t("applications.searchPlaceholder")}
              className="w-full pl-11 md:w-56"
              onChange={(event) => {
                const q = event.target.value.trim()
                onFiltersChange({ ...filters, q: q === "" ? undefined : q })
              }}
            />
          </form>
          <ApplicationFilters
            onClear={clearFilters}
            filters={filters}
            terms={(occupancy.data?.terms ?? []).map((term) => ({
              id: term.id,
              name: formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true }),
            }))}
            onChange={(next) => {
              if (next.term !== filters.term) setSelectedIds(new Set())
              onFiltersChange(next)
            }}
          />
        </div>
        {query.isPending ? (
          <ListSkeleton />
        ) : query.isError ? (
          <ErrorState
            title={t("applications.error")}
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <section
            aria-busy={query.isFetching}
            className="flex flex-col gap-4 md:rounded-lg md:border md:border-border-strong md:bg-card md:p-6"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {t("applications.count", { count: query.data.length })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t(
                  isQueue || automaticTerm
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
                  className="size-6"
                  checked={isAllSelected || (selected.length > 0 && "indeterminate")}
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
            {query.data.length === 0 && isOnlyIndividual && !isQueue ? (
              // US-38: nobody asked for individual accommodation yet.
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <BedDouble
                    className="size-6"
                    aria-hidden="true"
                  />
                </span>
                <h2 className="text-lg font-semibold">{t("applications.emptyIndividualTitle")}</h2>
                <p className="max-w-prose text-sm text-muted-foreground">
                  {t("applications.emptyIndividualHint")}
                </p>
                <Button
                  variant="secondary"
                  size="lg"
                  className="mt-2 border border-border"
                  onClick={clearEmptySearch}
                >
                  <FilterX
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                  {t("applications.clearSearchAndFilters")}
                </Button>
              </div>
            ) : query.data.length === 0 ? (
              <div className="flex flex-col items-start gap-4 py-6">
                <p className="text-sm text-muted-foreground">
                  {isQueue && !hasRemovableFilters
                    ? t("queue.empty")
                    : t(hasFilters ? "applications.empty" : "applications.noApplications")}
                </p>
                {isQueue && !hasRemovableFilters && (
                  <p className="text-sm text-muted-foreground">{t("queue.emptyHint")}</p>
                )}
                {hasRemovableFilters && (
                  <Button
                    variant="secondary"
                    size="lg"
                    className="h-auto min-h-11 cursor-pointer border border-border whitespace-normal transition-colors hover:border-input hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent active:border-primary active:bg-accent/80"
                    onClick={clearEmptySearch}
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
                <div className="hidden md:-mx-6 md:block">
                  <Table>
                    <TableHeader className="bg-action-subtle [&_th]:h-10 [&_th]:px-4">
                      <TableRow>
                        {bulkTerm && (
                          <TableHead className="w-10">
                            <span className="sr-only">{t("bulk.selected")}</span>
                          </TableHead>
                        )}
                        {(["participant", "terms", "payment", "dueAndOwed", "detail"] as const).map(
                          (key) => (
                            <TableHead key={key}>{t(`applications.${key}`)}</TableHead>
                          ),
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleRows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={selectedIds.has(row.id) ? "selected" : undefined}
                          className="cursor-pointer data-[state=selected]:bg-accent [&>td]:px-4 [&>td]:py-2"
                          onClick={(event) => {
                            // The detail link in the row stays the keyboard and new-tab path; the row only
                            // widens the mouse target. Controls and disclosed details keep their own behaviour.
                            if (
                              event.defaultPrevented ||
                              event.button !== 0 ||
                              event.metaKey ||
                              event.ctrlKey ||
                              event.shiftKey ||
                              event.altKey ||
                              (event.target as HTMLElement).closest(
                                "a, button, input, label, [role=checkbox], [data-slot=accordion-content]",
                              )
                            ) {
                              return
                            }
                            void navigate({
                              to: ROUTES.organizer.application,
                              params: { eventId, applicationId: row.id },
                            })
                          }}
                        >
                          {bulkTerm && (
                            <TableCell onClick={(event) => event.stopPropagation()}>
                              <SelectRow
                                row={row}
                                selectedIds={selectedIds}
                                onChange={setSelectedIds}
                              />
                            </TableCell>
                          )}
                          <TableCell className="max-w-72 min-w-0 whitespace-normal">
                            <ApplicationIdentity application={row} />
                          </TableCell>
                          <TableCell className="whitespace-normal">
                            <Terms
                              application={row}
                              filters={filters}
                            />
                          </TableCell>
                          <TableCell>
                            <PaymentStatus application={row} />
                          </TableCell>
                          <TableCell>
                            <p className="tabular-nums">
                              <MoneyAmount amountCzk={row.amountDueCzk} />
                            </p>
                            <p className="text-sm text-muted-foreground tabular-nums">
                              {t("applications.owed")} <MoneyAmount amountCzk={row.amountOwedCzk} />
                            </p>
                          </TableCell>
                          <TableCell>
                            <Button
                              asChild
                              variant="outline"
                              size="lg"
                            >
                              <Link
                                to={ROUTES.organizer.application}
                                params={{ eventId, applicationId: row.id }}
                              >
                                {t(
                                  row.amountOwedCzk > 0
                                    ? "payment.record"
                                    : "applications.applicationDetail",
                                )}
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ul className="flex flex-col gap-2 md:hidden">
                  {visibleRows.map((row) => (
                    <li
                      key={row.id}
                      className={cn(
                        "flex flex-col gap-1 rounded-lg border border-border-strong bg-card px-3",
                        selectedIds.has(row.id) && "bg-accent",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {bulkTerm && (
                          <div className="flex min-h-11 items-center">
                            <SelectRow
                              row={row}
                              selectedIds={selectedIds}
                              onChange={setSelectedIds}
                            />
                          </div>
                        )}
                        <ApplicationIdentity application={row} />
                      </div>
                      <Terms
                        application={row}
                        filters={filters}
                      />
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t py-1 text-sm">
                        <PaymentStatus application={row} />
                        <span className="font-medium">
                          {t("applications.owed")}: <MoneyAmount amountCzk={row.amountOwedCzk} />
                        </span>
                        <Button
                          asChild
                          variant="outline"
                          size="lg"
                          className="ms-auto h-auto min-h-11 max-w-full whitespace-normal"
                        >
                          <Link
                            to={ROUTES.organizer.application}
                            params={{ eventId, applicationId: row.id }}
                            aria-label={`${t(
                              row.amountOwedCzk > 0
                                ? "payment.record"
                                : "applications.applicationDetail",
                            )} · ${row.firstName} ${row.lastName}`}
                          >
                            {t(
                              row.amountOwedCzk > 0
                                ? "payment.record"
                                : "applications.applicationDetail",
                            )}
                          </Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <Pagination
                  page={currentPage}
                  pageCount={pageCount}
                  pageSize={PAGE_SIZE}
                  total={query.data.length}
                  onPageChange={setPage}
                />
                {bulkTerm && selected.length > 0 && (
                  <BulkSelectionBar
                    count={selected.length}
                    onEvaluate={() => setDialog("EVALUATE")}
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
      {bulkTerm && dialog === "EVALUATE" && (
        <BulkEvaluateDialog
          eventId={eventId}
          termId={bulkTerm.id}
          applications={selected}
          onClose={() => setDialog(null)}
          onDone={finishEvaluation}
        />
      )}
      {bulkTerm && dialog === "CONFIRM" && (
        <BulkConfirmDialog
          currentPageIds={new Set(visibleRows.map((row) => row.id))}
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

function ApplicationIdentity({ application }: { application: ListedApplication }) {
  const { t } = useTranslation("eventOverview")
  return (
    <Accordion
      type="single"
      collapsible
      className="min-w-0 flex-1"
    >
      <AccordionItem value={application.id}>
        <AccordionTrigger className="min-h-11 items-center gap-2 py-2 text-base font-semibold">
          <span className="flex min-w-0 flex-wrap items-center gap-2 wrap-anywhere">
            <span>
              {application.firstName} {application.lastName}
            </span>
            {application.individualAccommodation && (
              <Badge variant="secondary">{t("applications.individualAccommodation")}</Badge>
            )}
          </span>
        </AccordionTrigger>
        <AccordionContent className="cursor-text pb-2 wrap-anywhere whitespace-normal text-muted-foreground">
          <p>
            {formatDate(application.birthDate)} ·{" "}
            {t(application.gender === "FEMALE" ? "applications.female" : "applications.male")}
          </p>
          <p>{application.email}</p>
          <p>
            {t("applications.submitted")} · {formatDateTime(application.submittedAt)}
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

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
      className="relative size-6 after:absolute after:-inset-2.5 md:after:hidden"
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
  TO_EVALUATE: { variant: "neutral", className: undefined },
  CONFIRMED: { variant: "success", className: undefined },
  WAITLISTED: { variant: "waitlist", className: undefined },
  ARCHIVED: { variant: "secondary", className: undefined },
  CANCELLED: { variant: "inactive", className: undefined },
} as const

const STATUS_LABEL = {
  TO_EVALUATE: "toEvaluate",
  CONFIRMED: "confirmed",
  WAITLISTED: "waitlisted",
  CANCELLED: "cancelled",
  ARCHIVED: "archived",
} as const

/** More terms than this collapse to a summary, so a row does not grow with the number of terms (#727). */
const VISIBLE_TERMS = 3

function Terms({
  application,
  filters,
}: {
  application: ListedApplication
  filters: ApplicationsSearch
}) {
  const { t } = useTranslation("eventOverview")
  const [isExpanded, setIsExpanded] = useState(false)
  const listId = useId()
  // The term and status the list is filtered by come first, so the reason the row matches is always in view.
  const rank = (term: ListedApplication["terms"][number]) =>
    (filters.term && term.id === filters.term ? 0 : 2) +
    (filters.status && term.status === filters.status ? 0 : 1)
  const sorted =
    application.terms.length > VISIBLE_TERMS
      ? [...application.terms].sort((a, b) => rank(a) - rank(b))
      : application.terms
  const isCollapsible = sorted.length > VISIBLE_TERMS
  const shown = isCollapsible && !isExpanded ? sorted.slice(0, VISIBLE_TERMS) : sorted
  const hidden = sorted.slice(VISIBLE_TERMS)
  const summary = (Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[])
    .map((status) => ({ status, count: hidden.filter((term) => term.status === status).length }))
    .filter((entry) => entry.count > 0)
    .map((entry) => t(`applications.termCount.${entry.status}`, { count: entry.count }))
    .join(", ")
  return (
    <div className="flex flex-col gap-2">
      <div
        id={listId}
        className="flex flex-col gap-2"
      >
        {shown.map((term) => (
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
                ? t("applications.waitlistedPosition", { position: term.waitlistPosition })
                : t(`applications.${STATUS_LABEL[term.status]}`)}
            </Badge>
          </div>
        ))}
      </div>
      {isCollapsible ? (
        <div className="flex flex-col items-start gap-1">
          {isExpanded ? null : (
            <p className="text-sm whitespace-normal text-muted-foreground">
              {t("applications.termsHidden", { count: hidden.length, summary })}
            </p>
          )}
          <Button
            type="button"
            variant="link"
            className="h-auto min-h-11 p-0 whitespace-normal"
            aria-expanded={isExpanded}
            aria-controls={listId}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {t(isExpanded ? "applications.hideTerms" : "applications.showAllTerms", {
              count: sorted.length,
            })}
          </Button>
        </div>
      ) : null}
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

// Figma: Automatické vyhodnocení · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK?node-id=19088-23988 (shared capacity 19088-24704)
function AutomaticCapacity({ term }: { term: TermOccupancy }) {
  const { t } = useTranslation("eventOverview")
  const groups = term.byGender
  const description = groups
    ? groups.FEMALE.free <= 0 && groups.MALE.free > 0
      ? "womenFull"
      : groups.MALE.free <= 0 && groups.FEMALE.free > 0
        ? "menFull"
        : "genderRule"
    : term.free <= 0
      ? "sharedFull"
      : "sharedRule"
  return (
    <div className="flex flex-col gap-3">
      <Alert>
        <AlertTitle>
          {groups
            ? t("automaticCapacity.genderTitle", {
                women: groups.FEMALE.confirmed,
                womenBeds: groups.FEMALE.capacity,
                men: groups.MALE.confirmed,
                menBeds: groups.MALE.capacity,
              })
            : t("automaticCapacity.sharedTitle", {
                confirmed: term.confirmed,
                beds: term.capacity,
                count: term.capacity,
              })}
        </AlertTitle>
        <AlertDescription>{t(`automaticCapacity.${description}`)}</AlertDescription>
      </Alert>
      <p className="text-sm text-muted-foreground">{t("automaticCapacity.receipt")}</p>
    </div>
  )
}
