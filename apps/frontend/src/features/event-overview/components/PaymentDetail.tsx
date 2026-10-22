import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Seo } from "@/components/atoms/Seo"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDate, formatDateRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import { paymentQueryOptions, type Payment } from "@/features/event-overview/api/payments"
import { PaymentCancellation } from "@/features/event-overview/components/PaymentCancellation"
import { PaymentEditor } from "@/features/event-overview/components/PaymentEditor"

// Figma: O34a/b/c · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-4661
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
  const latest = data.payments.at(-1)
  const isOverpaid = data.amountOwedCzk < 0
  const isPaid = data.amountOwedCzk === 0 && data.payments.length > 0
  const metrics = [
    {
      label: t("payment.due"),
      amount: data.amountDueCzk,
      helper: data.terms
        .filter((term) => term.status === "CONFIRMED")
        .map((term) => formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true }))
        .join(", "),
    },
    {
      label: t("payment.paid"),
      amount: data.amountPaidCzk,
      helper: latest
        ? t("payment.recordedOn", { date: formatDate(latest.createdAt) })
        : t("payment.noPayment"),
    },
    {
      label: t(isOverpaid ? "payment.overpaid" : "payment.remaining"),
      amount: Math.abs(data.amountOwedCzk),
      warning: isOverpaid,
      helper: t(
        isOverpaid ? "payment.overpaidHelper" : isPaid ? "payment.settled" : "payment.unpaid",
      ),
    },
  ]
  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("payment.title")} />
      <PageHeader
        title={t("payment.title")}
        description={t("payment.description")}
        actions={
          <>
            <Button
              asChild
              variant="outline"
              size="lg"
            >
              <Link
                to={ROUTES.organizer.eventApplications}
                params={{ eventId: data.eventId }}
              >
                {t("payment.back")}
              </Link>
            </Button>
            <Button
              size="lg"
              onClick={() => setIsEditorOpen(true)}
            >
              {t("payment.record")}
            </Button>
          </>
        }
      />
      <h2 className="text-2xl font-semibold">
        {data.firstName} {data.lastName} · {data.code}
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card
            key={metric.label}
            className={
              metric.warning ? "gap-2 border-status-warning bg-status-warning-bg p-6" : "gap-2 p-6"
            }
          >
            <h3 className="text-xs font-medium text-muted-foreground">{metric.label}</h3>
            <MoneyAmount
              amountCzk={metric.amount}
              className="text-4xl font-bold"
            />
            <p className="text-sm text-muted-foreground">{metric.helper}</p>
          </Card>
        ))}
      </div>
      <Alert
        className={
          isOverpaid
            ? "border-status-warning bg-status-warning-bg"
            : isPaid
              ? "border-status-success bg-status-success-bg"
              : latest
                ? "border-status-warning bg-status-warning-bg"
                : "border-primary bg-accent"
        }
      >
        <AlertTitle className="line-clamp-none">
          {t(
            isOverpaid
              ? "payment.overpaidTitle"
              : isPaid
                ? "payment.recorded"
                : latest
                  ? "payment.partialTitle"
                  : "payment.waiting",
            {
              amount: formatCzk(Math.abs(data.amountOwedCzk)),
            },
          )}
        </AlertTitle>
        <AlertDescription>
          {latest
            ? t(
                isOverpaid
                  ? "payment.overpaidSummary"
                  : isPaid
                    ? "payment.settledSummary"
                    : "payment.summary",
                {
                  due: formatCzk(data.amountDueCzk),
                  paid: formatCzk(data.amountPaidCzk),
                  owed: formatCzk(data.amountOwedCzk),
                },
              )
            : t("payment.waitingDescription", { amount: formatCzk(data.amountDueCzk) })}
        </AlertDescription>
        {isOverpaid ? (
          <Button
            className="col-start-2 mt-4 w-fit"
            onClick={() => setIsRefundOpen(true)}
          >
            {t("payment.refund")}
          </Button>
        ) : null}
      </Alert>
      <Card className="gap-4 p-6">
        <h2 className="text-lg font-semibold">{t("payment.history")}</h2>
        {data.payments.length === 0 ? (
          <p className="text-muted-foreground">{t("payment.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  {(["date", "method", "historyAmount", "recorder"] as const).map((key) => (
                    <th
                      key={key}
                      className="p-4 font-medium"
                    >
                      {t(`payment.${key}`)}
                    </th>
                  ))}
                  <th className="p-4">
                    <span className="sr-only">{t("payment.cancelRecord")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b"
                  >
                    <td className="p-4 whitespace-nowrap">{formatDate(payment.createdAt)}</td>
                    <td className="p-4">
                      {t(payment.amountCzk < 0 ? "payment.refundMethod" : "payment.manual")}
                    </td>
                    <td className="p-4">
                      <MoneyAmount amountCzk={payment.amountCzk} />
                    </td>
                    <td className="p-4">
                      {t("payment.recordedBy", { name: payment.recordedByName })}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setPaymentToCancel(payment)}
                      >
                        {t("payment.cancelRecord")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
