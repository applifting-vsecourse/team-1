import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Seo } from "@/components/atoms/Seo"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
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
import { formatDate } from "@/lib/date"

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
        <div className="flex flex-col gap-4">
          {entries.map((entry) => (
            <PaymentOverviewCard
              key={entry.termId + entry.applicationId}
              entry={entry}
              eventId={eventId}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function PaymentOverviewCard({ entry, eventId }: { entry: PaymentOverviewEntry; eventId: string }) {
  const { t } = useTranslation("eventOverview")
  const status =
    entry.paymentStatus === "OVERPAID" || entry.paymentStatus === "NOTHING_DUE"
      ? "PAID"
      : entry.paymentStatus
  return (
    <Card className="gap-4 p-4">
      <h3 className="text-xl font-bold tracking-tight">
        {entry.firstName} {entry.lastName}
      </h3>
      {entry.termName ? <p>{entry.termName}</p> : null}
      <p className="flex flex-wrap gap-x-1">
        <span>{t(`paymentsOverview.statuses.${status}`)}</span>
        {entry.overdue ? <span>· {t("paymentsOverview.statuses.OVERDUE")}</span> : null}
        <span>
          · {t(entry.amountOwedCzk < 0 ? "paymentsOverview.overpayment" : "paymentsOverview.debt")}{" "}
          <MoneyAmount amountCzk={Math.abs(entry.amountOwedCzk)} />
        </span>
      </p>
      <p>
        {t("paymentsOverview.dueDate")} {formatDate(entry.paymentDueAt)} ·{" "}
        {t("paymentsOverview.reminderCount")} {entry.reminderCount}
      </p>
      {entry.lastReminderAt ? (
        <p>
          {t("paymentsOverview.lastReminder")} {formatDate(entry.lastReminderAt)}
        </p>
      ) : null}
      <Button
        asChild
        variant="ghost"
        className="w-full"
      >
        <Link
          to={ROUTES.organizer.application}
          params={{ eventId, applicationId: entry.applicationId }}
        >
          {t("paymentsOverview.detail")}
        </Link>
      </Button>
    </Card>
  )
}
