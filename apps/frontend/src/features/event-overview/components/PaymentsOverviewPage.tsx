import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Seo } from "@/components/atoms/Seo"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Pagination } from "@/components/molecules/Pagination"
import { SectionHeader } from "@/components/molecules/SectionHeader"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { usePagination } from "@/hooks/usePagination"
import { formatDate } from "@/lib/date"
import { termDates, termName, termTitle } from "@/lib/term-label"

import {
  paymentOverviewQueryOptions,
  type PaymentOverviewEntry,
} from "@/features/event-overview/api/paymentOverview"

type StatusFilter = "ALL" | "DEBT" | "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERDUE"
type ReminderFilter = "ALL" | "SENT" | "NOT_SENT"

function searchText(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
}

function matches(entry: PaymentOverviewEntry, status: StatusFilter, reminder: ReminderFilter) {
  const isPaymentMatch =
    status === "ALL" ||
    (status === "DEBT" && entry.amountOwedCzk > 0) ||
    (status === "OVERDUE"
      ? entry.overdue
      : status === "PAID"
        ? ["PAID", "OVERPAID", "NOTHING_DUE"].includes(entry.paymentStatus)
        : entry.paymentStatus === status)
  const isReminderMatch =
    reminder === "ALL" ||
    (reminder === "SENT"
      ? entry.reminderCount > 0 && entry.amountOwedCzk > 0
      : entry.reminderCount === 0)
  return isPaymentMatch && isReminderMatch
}

// Figma v2: US-45 Všechny platby · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20544-42470 (360 px: node-id=20544-42849)
export function PaymentsOverviewPage({
  eventId,
  terms,
}: {
  eventId: string
  terms: { id: string; name: string | null; startsOn: string; endsOn: string }[]
}) {
  const { t } = useTranslation("eventOverview")
  const { data, isPending, error, refetch } = useQuery(paymentOverviewQueryOptions(eventId))
  const [status, setStatus] = useState<StatusFilter>("ALL")
  const [reminder, setReminder] = useState<ReminderFilter>("ALL")

  const [search, setSearch] = useState("")
  const [termId, setTermId] = useState("ALL")

  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        title={t("paymentsOverview.error")}
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  const words = searchText(search).trim().split(/\s+/).filter(Boolean)
  const exactSymbols = new Set(
    words.filter(
      (word) =>
        /^\d+$/.test(word) &&
        data.entries.some(
          (entry) => entry.variableSymbol === word || entry.summaryVariableSymbol === word,
        ),
    ),
  )
  const entries = data.entries.filter((entry) => {
    if (!matches(entry, status, reminder) || (termId !== "ALL" && entry.termId !== termId)) {
      return false
    }
    const text = searchText(
      [entry.firstName, entry.lastName, entry.variableSymbol, entry.summaryVariableSymbol].join(
        " ",
      ),
    )
    return words.every((word) =>
      exactSymbols.has(word)
        ? entry.variableSymbol === word || entry.summaryVariableSymbol === word
        : text.includes(word),
    )
  })
  const selectionDebt = entries.reduce((sum, entry) => sum + entry.payableCzk, 0)
  const isFiltered = search !== "" || termId !== "ALL" || status !== "ALL" || reminder !== "ALL"
  // A tile is a shortcut to the same selection through the existing filters.
  const showOnly = (nextStatus: StatusFilter, nextReminder: ReminderFilter) => {
    setSearch("")
    setTermId("ALL")
    setStatus(nextStatus)
    setReminder(nextReminder)
  }
  const clearFilters = () => showOnly("ALL", "ALL")
  const tiles = [
    {
      title: t("paymentsOverview.totalDebt"),
      amount: data.totalDebtCzk,
      detail: t("paymentsOverview.debtors", { count: data.debtorCount }),
    },
    {
      title: t("paymentsOverview.statuses.OVERDUE"),
      amount: data.debtByFilter.OVERDUE.ALL,
      detail: t("paymentsOverview.overdueCount", {
        count: data.entries.filter((entry) => matches(entry, "OVERDUE", "ALL")).length,
      }),
      onSelect: () => showOnly("OVERDUE", "ALL"),
    },
    {
      title: t("paymentsOverview.remindedDebt"),
      amount: data.debtByFilter.ALL.SENT,
      detail: t("paymentsOverview.remindedCount", {
        count: data.entries.filter((entry) => matches(entry, "ALL", "SENT")).length,
      }),
      onSelect: () => showOnly("ALL", "SENT"),
    },
  ]
  return (
    <section className="flex flex-col gap-6">
      <Seo title={t("paymentsOverview.title")} />
      <SectionHeader
        isTitleHidden
        title={t("paymentsOverview.title")}
        actions={
          <>
            <Button
              asChild
              variant="outline"
              size="lg"
            >
              <Link
                to={ROUTES.organizer.eventOverpayments}
                params={{ eventId }}
              >
                {t("overpayments.title")}
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="lg"
            >
              <Link
                to={ROUTES.organizer.eventCancellationTerms}
                params={{ eventId }}
              >
                {t("paymentsOverview.cancellationTerms")}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
            >
              <Link
                to={ROUTES.organizer.eventPaymentsImport}
                params={{ eventId }}
              >
                {t("paymentsOverview.uploadStatement")}
              </Link>
            </Button>
          </>
        }
      />
      {/* 360 px: the three tiles are rows of one box. */}
      <div className="grid gap-4 rounded-lg border border-border-strong bg-card p-4 sm:grid-cols-3 sm:border-0 sm:bg-transparent sm:p-0 nested:border-border">
        {tiles.map((tile) => {
          const content = (
            <>
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{tile.title}</span>
                <MoneyAmount
                  amountCzk={tile.amount}
                  className="text-2xl font-medium"
                />
              </span>
              <span className="text-sm sm:text-base">{tile.detail}</span>
            </>
          )
          const box =
            "flex flex-col gap-1 text-left sm:gap-4 sm:rounded-lg sm:border sm:border-border-strong sm:bg-card sm:p-4"
          return tile.onSelect ? (
            <Button
              key={tile.title}
              type="button"
              variant="ghost"
              className={`${box} h-auto items-stretch justify-start rounded-md font-normal whitespace-normal hover:text-foreground`}
              onClick={tile.onSelect}
            >
              {content}
            </Button>
          ) : (
            <div
              key={tile.title}
              className={box}
            >
              {content}
            </div>
          )
        })}
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:items-end lg:grid-cols-4">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-[17px] size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label={t("paymentsOverview.search")}
            placeholder={t("paymentsOverview.search")}
            className="pl-11"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="payment-term">{t("paymentsOverview.term")}</Label>
          <Select
            value={termId}
            onValueChange={setTermId}
          >
            <SelectTrigger
              id="payment-term"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("applications.allTerms")}</SelectItem>
              {terms.map((term) => (
                <SelectItem
                  key={term.id}
                  value={term.id}
                >
                  {termTitle(term)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="payment-status">{t("paymentsOverview.statusFilter")}</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as StatusFilter)}
          >
            <SelectTrigger
              id="payment-status"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["ALL", "DEBT", "UNPAID", "PARTIALLY_PAID", "PAID", "OVERDUE"] as const).map(
                (value) => (
                  <SelectItem
                    key={value}
                    value={value}
                  >
                    {t(`paymentsOverview.statuses.${value}`)}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="payment-reminders">{t("paymentsOverview.reminderFilter")}</Label>
          <Select
            value={reminder}
            onValueChange={(value) => setReminder(value as ReminderFilter)}
          >
            <SelectTrigger
              id="payment-reminders"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["ALL", "SENT", "NOT_SENT"] as const).map((value) => (
                <SelectItem
                  key={value}
                  value={value}
                >
                  {t(`paymentsOverview.reminders.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite">
          {t("paymentsOverview.selection", { count: entries.length })}
          {" · "}
          {t("paymentsOverview.selectionDebt")} <MoneyAmount amountCzk={selectionDebt} />
        </p>
        {isFiltered ? (
          <Button
            variant="ghost"
            onClick={clearFilters}
          >
            {t("paymentsOverview.clearFilters")}
          </Button>
        ) : null}
      </div>
      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-6 py-4">
          <h3 className="text-xl font-semibold">
            {t(
              data.entries.length === 0
                ? "paymentsOverview.noApplications"
                : "paymentsOverview.empty",
            )}
          </h3>
        </div>
      ) : (
        <PaymentEntries
          entries={entries}
          eventId={eventId}
          resetKey={JSON.stringify([search, termId, status, reminder])}
        />
      )}
    </section>
  )
}

function PaymentEntries({
  entries,
  eventId,
  resetKey,
}: {
  entries: PaymentOverviewEntry[]
  eventId: string
  resetKey: string
}) {
  const { t } = useTranslation("eventOverview")
  const { pageItems, ...pagination } = usePagination(entries, resetKey)
  return (
    <div className="flex flex-col gap-4">
      <div className="md:rounded-lg md:border md:border-border-strong md:bg-card">
        <Table className="block w-full md:table">
          <caption className="sr-only">{t("paymentsOverview.list")}</caption>
          <TableHeader className="sr-only bg-muted md:not-sr-only md:table-header-group">
            <TableRow>
              <TableHead className="h-12 px-4">{t("paymentsOverview.participant")}</TableHead>
              <TableHead className="px-4">{t("paymentsOverview.term")}</TableHead>
              <TableHead className="px-4">{t("paymentsOverview.statusFilter")}</TableHead>
              <TableHead className="px-4">{t("paymentsOverview.debt")}</TableHead>
              <TableHead className="px-4">{t("paymentsOverview.dueAndReminders")}</TableHead>
              <TableHead className="px-4">
                <span className="sr-only">{t("paymentsOverview.detail")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="grid gap-4 md:table-row-group">
            {pageItems.map((entry) => (
              <PaymentOverviewRow
                key={entry.termId + entry.applicationId}
                entry={entry}
                eventId={eventId}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination
        {...pagination}
        onPageChange={pagination.setPage}
      />
    </div>
  )
}

function PaymentOverviewRow({ entry, eventId }: { entry: PaymentOverviewEntry; eventId: string }) {
  const { t } = useTranslation("eventOverview")
  const status =
    entry.paymentStatus === "OVERPAID" || entry.paymentStatus === "NOTHING_DUE"
      ? "PAID"
      : entry.paymentStatus
  const name = termName({ name: entry.termName })
  return (
    <TableRow className="grid gap-4 rounded-lg border bg-card p-4 max-md:last:border-b md:table-row md:rounded-none md:border-x-0 md:border-t-0 md:p-0">
      <TableCell className="p-0 whitespace-normal md:px-4 md:py-4">
        <span className="text-2xl font-bold md:text-sm md:font-medium">
          {entry.firstName} {entry.lastName}
        </span>
        {entry.applicationNumber !== undefined && (
          <span className="hidden text-sm font-normal text-muted-foreground md:block">
            #{entry.applicationNumber}
          </span>
        )}
        <span className="block text-sm font-normal text-muted-foreground md:hidden">
          {t("paymentsOverview.symbol", { value: entry.variableSymbol })}
        </span>
      </TableCell>
      <TableCell className="p-0 whitespace-normal md:px-4 md:py-4 md:text-sm md:text-muted-foreground">
        {name ? (
          <>
            <span className="md:block">{name}</span>
            <span className="md:hidden"> · </span>
          </>
        ) : null}
        <span className="md:block">
          {termDates({ startsOn: entry.startsOn, endsOn: entry.endsOn })}
        </span>
      </TableCell>
      <TableCell className="flex flex-wrap gap-2 p-0 whitespace-normal md:table-cell md:px-4 md:py-4">
        <Badge
          variant={status === "PARTIALLY_PAID" ? "warning" : undefined}
          className={
            status === "PAID"
              ? "bg-primary text-primary-foreground"
              : status === "UNPAID"
                ? "bg-destructive text-destructive-foreground"
                : undefined
          }
        >
          {t(`paymentsOverview.statuses.${status}`)}
        </Badge>
        {entry.overdue ? (
          <Badge className="bg-destructive text-destructive-foreground md:hidden">
            {t("paymentsOverview.statuses.OVERDUE")}
          </Badge>
        ) : null}
      </TableCell>
      <TableCell className="flex items-center justify-between gap-2 p-0 whitespace-normal md:table-cell md:px-4 md:py-4 md:text-sm md:text-muted-foreground">
        {entry.amountOwedCzk >= 0 && (
          <span className="text-sm font-medium text-foreground md:hidden">
            {t("paymentsOverview.toPay")}
          </span>
        )}
        {entry.amountOwedCzk < 0 ? (
          <span>
            {t("paymentsOverview.overpayment")} <MoneyAmount amountCzk={-entry.amountOwedCzk} />
          </span>
        ) : (
          <MoneyAmount
            amountCzk={entry.amountOwedCzk}
            className="text-2xl font-medium md:text-sm md:font-normal"
          />
        )}
      </TableCell>
      <TableCell className="flex flex-col gap-4 p-0 whitespace-normal md:table-cell md:px-4 md:py-4 md:text-sm">
        <span className={entry.overdue ? "md:text-destructive" : undefined}>
          <span className="md:hidden">{t("paymentsOverview.dueOn")} </span>
          {formatDate(entry.paymentDueAt)}
          {entry.overdue ? (
            <span className="max-md:hidden">
              {` · ${t("paymentsOverview.statuses.OVERDUE").toLowerCase()}`}
            </span>
          ) : null}
        </span>
        <span className={entry.overdue ? "md:block md:text-destructive" : "md:block"}>
          {entry.lastReminderAt
            ? t("paymentsOverview.remindersLast", {
                count: entry.reminderCount,
                date: formatDate(entry.lastReminderAt),
              })
            : t("paymentsOverview.remindersLine", { count: entry.reminderCount })}
        </span>
        <span className="md:hidden">
          {t("termPayment.variableSymbol", { ns: "common" })} {entry.variableSymbol}
        </span>
      </TableCell>
      <TableCell className="p-0 md:px-4 md:py-2 md:text-right">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="max-w-full whitespace-normal"
        >
          <Link
            to={ROUTES.organizer.application}
            params={{ eventId, applicationId: entry.applicationId }}
            aria-label={`${t("paymentsOverview.detail")} ${entry.firstName} ${entry.lastName}`}
          >
            <span className="md:hidden">{t("paymentsOverview.paymentDetail")}</span>
            <span className="max-md:hidden">{t("paymentsOverview.detail")}</span>
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  )
}
