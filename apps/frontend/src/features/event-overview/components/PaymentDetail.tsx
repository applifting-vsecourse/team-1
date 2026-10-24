import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Seo } from "@/components/atoms/Seo"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDate, formatDateRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { cn } from "@/lib/utils"

import {
  paymentQueryOptions,
  type Payment,
  type PaymentApplication,
} from "@/features/event-overview/api/payments"
import { PaymentCancellation } from "@/features/event-overview/components/PaymentCancellation"
import { PaymentEditor } from "@/features/event-overview/components/PaymentEditor"

type PaymentState = "unpaid" | "partial" | "paid" | "overpaid"

const STATE_BADGE = {
  unpaid: "secondary",
  partial: "warning",
  paid: "success",
  overpaid: "info",
} as const

const STATE_ALERT = {
  unpaid: "border-status-info bg-status-info-bg",
  partial: "border-status-warning bg-status-warning-bg",
  paid: "border-status-success bg-status-success-bg",
  overpaid: "border-status-warning bg-status-warning-bg",
} as const

function paymentState(application: PaymentApplication): PaymentState {
  if (application.amountOwedCzk < 0) return "overpaid"
  if (application.payments.length === 0) return "unpaid"
  return application.amountOwedCzk === 0 ? "paid" : "partial"
}

/**
 * O34: payments of one application under the event's Applications tab — who and what state,
 * the one primary action (plus the refund when overpaid), three amounts, what the state means
 * and the history with a trash button per record. On a phone the amounts become one card of
 * rows and the history a list (M13).
 */
// Figma (Design system): O34a Detail platby · nezaplaceno · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-4661
// Figma (Design system): O34b Zaplaceno · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-5016
// Figma (Design system): O34c Částečně zaplaceno · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-5206
// Figma (Design system): O34k Přeplatek · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13980-10231
// Figma (Design system): O34o Po vrácení části přeplatku · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13983-9017
// Figma (Design system): M13 Detail platby přihlášky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14070-41745
export function PaymentDetail({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation("eventOverview")
  const { data, isPending, error, refetch } = useQuery(paymentQueryOptions(applicationId))
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isRefundOpen, setIsRefundOpen] = useState(false)
  const [paymentToCancel, setPaymentToCancel] = useState<Payment | null>(null)
  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        title={t("payment.errorTitle")}
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }
  const state = paymentState(data)
  const isOverpaid = state === "overpaid"
  const receipts = data.payments.filter((payment) => payment.amountCzk > 0).length
  const refunds = data.payments.length - receipts
  const confirmedTerms = data.terms
    .filter((term) => term.status === "CONFIRMED")
    .map((term) => formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true }))
    .join(", ")
  const metrics = [
    { label: t("payment.due"), amount: data.amountDueCzk, helper: confirmedTerms },
    {
      label: t("payment.paid"),
      amount: data.amountPaidCzk,
      helper:
        data.payments.length === 0
          ? t("payment.noPayment")
          : refunds > 0
            ? t("payment.receiptsAndRefunds", {
                receipts: t("payment.receiptCount", { count: receipts }),
                refunds: t("payment.refundCount", { count: refunds }),
              })
            : t("payment.receiptCount", { count: receipts }),
    },
    {
      label: t(isOverpaid ? "payment.overpaid" : "payment.remaining"),
      amount: Math.abs(data.amountOwedCzk),
      isWarning: isOverpaid,
      helper: t(
        isOverpaid
          ? "payment.overpaidHelper"
          : state === "paid"
            ? "payment.settled"
            : "payment.unpaid",
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("payment.title")} />
      <div className="flex flex-col gap-2">
        {/* Figma DS / Button Style=Quiet, aligned with the heading (no left padding). */}
        <Button
          asChild
          variant="ghost"
          size="lg"
          className="self-start px-0 hover:bg-transparent hover:underline dark:hover:bg-transparent"
        >
          <Link
            to={ROUTES.organizer.eventApplications}
            params={{ eventId: data.eventId }}
          >
            {t("payment.back")}
          </Link>
        </Button>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                {data.firstName} {data.lastName} · {data.code}
              </h2>
              <Badge variant={STATE_BADGE[state]}>{t(`payment.state.${state}`)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{t("payment.description")}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {isOverpaid ? (
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsRefundOpen(true)}
              >
                {t("payment.refund")}
              </Button>
            ) : null}
            <Button
              size="lg"
              onClick={() => setIsEditorOpen(true)}
            >
              {t("payment.record")}
            </Button>
          </div>
        </div>
      </div>
      {/* One card of rows on a phone (M13), three metric cards from md up (O34). */}
      <div className="flex flex-col rounded-xl border bg-card px-4 py-2 shadow-sm md:grid md:grid-cols-3 md:gap-6 md:border-0 md:bg-transparent md:p-0 md:shadow-none">
        {metrics.map((metric, index) => (
          <section
            key={metric.label}
            className="flex items-baseline justify-between gap-4 py-2 md:flex-col md:items-start md:gap-2 md:rounded-xl md:border md:bg-card md:p-6 md:shadow-sm"
          >
            <h3 className="text-sm text-muted-foreground md:text-xs md:font-medium">
              {metric.label}
            </h3>
            <MoneyAmount
              amountCzk={metric.amount}
              className={cn(
                "font-medium md:text-4xl md:font-bold",
                index === metrics.length - 1 && "text-lg font-semibold",
                metric.isWarning && "text-status-warning",
              )}
            />
            <p className="hidden text-sm text-muted-foreground md:block">{metric.helper}</p>
          </section>
        ))}
      </div>
      <Alert className={STATE_ALERT[state]}>
        <AlertTitle className="line-clamp-none">
          {t(
            isOverpaid
              ? "payment.overpaidTitle"
              : state === "paid"
                ? "payment.recorded"
                : state === "partial"
                  ? "payment.partialTitle"
                  : "payment.waiting",
            { amount: formatCzk(Math.abs(data.amountOwedCzk)) },
          )}
        </AlertTitle>
        <AlertDescription>
          {state === "unpaid"
            ? t("payment.waitingDescription", { amount: formatCzk(data.amountDueCzk) })
            : t(
                isOverpaid
                  ? "payment.overpaidSummary"
                  : state === "paid"
                    ? "payment.settledSummary"
                    : "payment.summary",
                {
                  due: formatCzk(data.amountDueCzk),
                  paid: formatCzk(data.amountPaidCzk),
                  owed: formatCzk(data.amountOwedCzk),
                },
              )}
        </AlertDescription>
      </Alert>
      <Card className="gap-4 p-4 md:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{t("payment.history")}</h2>
          <p className="text-sm text-muted-foreground">{t("payment.historyHelper")}</p>
        </div>
        {data.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("payment.empty")}</p>
        ) : (
          <PaymentHistory
            payments={data.payments}
            onCancel={setPaymentToCancel}
          />
        )}
      </Card>
      {isEditorOpen ? (
        <PaymentEditor
          application={data}
          onClose={() => setIsEditorOpen(false)}
        />
      ) : null}
      {paymentToCancel ? (
        <PaymentCancellation
          application={data}
          payment={paymentToCancel}
          onClose={() => setPaymentToCancel(null)}
        />
      ) : null}
      {isRefundOpen ? (
        <PaymentEditor
          application={data}
          isRefund
          onClose={() => setIsRefundOpen(false)}
        />
      ) : null}
    </div>
  )
}

/** A table from md up; on a phone each row stacks into amount, then date, method and author. */
function PaymentHistory({
  payments,
  onCancel,
}: {
  payments: Payment[]
  onCancel: (payment: Payment) => void
}) {
  const { t } = useTranslation("eventOverview")
  const detail = "text-xs text-muted-foreground md:text-sm md:text-foreground"

  return (
    <table className="w-full text-left text-sm">
      <thead className="hidden text-xs text-muted-foreground md:table-header-group">
        <tr className="bg-muted">
          <th className="h-10 rounded-l-md px-3 font-medium">{t("payment.date")}</th>
          <th className="h-10 px-3 font-medium">{t("payment.method")}</th>
          <th className="h-10 px-3 text-right font-medium">{t("payment.historyAmount")}</th>
          <th className="h-10 px-3 font-medium">{t("payment.recorder")}</th>
          <th className="h-10 rounded-r-md px-3">
            <span className="sr-only">{t("payment.cancelRecord")}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {payments.map((payment) => (
          <tr
            key={payment.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] border-b py-2 last:border-b-0 md:table-row"
          >
            <td className={cn("col-start-1 row-start-2 md:px-3 md:py-4", detail)}>
              {formatDate(payment.createdAt)}
            </td>
            <td className={cn("col-start-1 row-start-3 md:px-3 md:py-4", detail)}>
              {t(payment.amountCzk < 0 ? "payment.refundMethod" : "payment.manual")}
            </td>
            <td className="col-start-1 row-start-1 font-semibold md:px-3 md:py-4 md:text-right">
              <MoneyAmount
                amountCzk={payment.amountCzk}
                className={cn(payment.amountCzk < 0 && "text-status-warning")}
              />
            </td>
            <td className={cn("col-start-1 row-start-4 md:px-3 md:py-4", detail)}>
              {payment.recordedByName}
            </td>
            <td className="col-start-2 row-span-4 row-start-1 self-center text-right md:px-3 md:py-2">
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={t("payment.cancelRecord")}
                onClick={() => onCancel(payment)}
              >
                <Trash2 />
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
