import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Seo } from "@/components/atoms/Seo"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Pagination } from "@/components/molecules/Pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
import { termTitle } from "@/lib/term-label"

import {
  paymentOverviewQueryOptions,
  type PaymentOverviewEntry,
} from "@/features/event-overview/api/paymentOverview"

type StatusFilter = "ALL" | "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERDUE"
type ReminderFilter = "ALL" | "SENT" | "NOT_SENT"

function matches(entry: PaymentOverviewEntry, status: StatusFilter, reminder: ReminderFilter) {
  const isPaymentMatch =
    status === "ALL" ||
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

// Figma (Design system): #399 Přehled plateb · detail a storno podmínky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=22642-92813 (360 px: node-id=22642-93088)
// Figma (Design system): #45 / Platby / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-51878
// Figma (Design system): #45 / Platby / Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-52056
// Figma (Design system): #45 / Žádné přihlášky neodpovídají filtru · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-52384 (mobile: 19786-52519)
export function PaymentsOverviewPage({
  eventId,
  eventName,
}: {
  eventId: string
  eventName?: string
}) {
  const { t } = useTranslation("eventOverview")
  const { data, isPending, error, refetch } = useQuery(paymentOverviewQueryOptions(eventId))
  const [status, setStatus] = useState<StatusFilter>("ALL")
  const [reminder, setReminder] = useState<ReminderFilter>("ALL")

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

  const entries = data.entries.filter((entry) => matches(entry, status, reminder))
  const clearFilters = () => {
    setStatus("ALL")
    setReminder("ALL")
  }
  return (
    <section className="flex flex-col gap-6">
      <Seo title={t("paymentsOverview.title")} />
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">{t("paymentsOverview.title")}</h2>
        {eventName ? <p>{eventName}</p> : null}
        <Button
          asChild
          variant="ghost"
          size="lg"
          className="self-start"
        >
          <Link
            to={ROUTES.organizer.eventCancellationTerms}
            params={{ eventId }}
          >
            {t("paymentsOverview.cancellationTerms")}
          </Link>
        </Button>
      </div>
      <Card className="gap-4 p-4">
        <h3 className="text-xl font-bold tracking-tight">
          {t("paymentsOverview.totalDebt")} · <MoneyAmount amountCzk={data.totalDebtCzk} />
        </h3>
        <p>
          {t("paymentsOverview.debtors", { count: data.debtorCount })} ·{" "}
          {t("paymentsOverview.overdueCount", { count: data.overdueCount })}
        </p>
      </Card>
      <div className="flex flex-col gap-4">
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
              {(["ALL", "UNPAID", "PARTIALLY_PAID", "PAID", "OVERDUE"] as const).map((value) => (
                <SelectItem
                  key={value}
                  value={value}
                >
                  {t(`paymentsOverview.statuses.${value}`)}
                </SelectItem>
              ))}
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
      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-6 py-4">
          <h3 className="text-xl font-semibold">
            {t(
              data.entries.length === 0
                ? "paymentsOverview.noApplications"
                : "paymentsOverview.empty",
            )}
          </h3>
          {data.entries.length > 0 ? (
            <Button
              variant="ghost"
              onClick={clearFilters}
            >
              {t("paymentsOverview.clearFilters")}
            </Button>
          ) : null}
        </div>
      ) : (
        <PaymentEntries
          entries={entries}
          eventId={eventId}
          resetKey={`${status}|${reminder}`}
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
      {/* On a phone the table scrolls sideways (Togena / Application list table). */}
      <div className="rounded-lg border bg-card">
        <Table className="min-w-190">
          <caption className="sr-only">{t("paymentsOverview.list")}</caption>
          <TableHeader className="bg-muted">
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
          <TableBody>
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
  return (
    <TableRow>
      <TableCell className="px-4 py-4 whitespace-normal">
        {entry.firstName} {entry.lastName}
      </TableCell>
      <TableCell className="px-4 py-4 whitespace-normal">
        {termTitle({ name: entry.termName, startsOn: entry.startsOn, endsOn: entry.endsOn })}
      </TableCell>
      <TableCell className="px-4 py-4">
        <Badge
          variant={
            status === "PAID" ? "success" : status === "PARTIALLY_PAID" ? "warning" : "secondary"
          }
        >
          {t(`paymentsOverview.statuses.${status}`)}
        </Badge>
      </TableCell>
      <TableCell className="px-4 py-4">
        {entry.amountOwedCzk < 0 ? (
          <span>
            {t("paymentsOverview.overpayment")} <MoneyAmount amountCzk={-entry.amountOwedCzk} />
          </span>
        ) : (
          <MoneyAmount amountCzk={entry.amountOwedCzk} />
        )}
      </TableCell>
      <TableCell className="px-4 py-4">
        <span className={entry.overdue ? "text-destructive" : undefined}>
          {formatDate(entry.paymentDueAt)}
          {entry.overdue ? ` · ${t("paymentsOverview.statuses.OVERDUE").toLowerCase()}` : null}
        </span>
        <br />
        <span className={entry.overdue ? "text-destructive" : undefined}>
          {entry.lastReminderAt
            ? t("paymentsOverview.remindersLast", {
                count: entry.reminderCount,
                date: formatDate(entry.lastReminderAt),
              })
            : t("paymentsOverview.remindersLine", { count: entry.reminderCount })}
        </span>
      </TableCell>
      <TableCell className="px-4 py-2">
        <Button
          asChild
          variant="ghost"
          size="lg"
        >
          <Link
            to={ROUTES.organizer.application}
            params={{ eventId, applicationId: entry.applicationId }}
            aria-label={`${t("paymentsOverview.detail")} ${entry.firstName} ${entry.lastName}`}
          >
            {t("paymentsOverview.detail")}
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  )
}
