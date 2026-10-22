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
import { PaymentEditor } from "@/features/event-overview/components/PaymentEditor"

// Figma: O34a/b/c · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-4661
export function PaymentDetail({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation("eventOverview")
  const { data, isPending, error, refetch } = useQuery(paymentQueryOptions(applicationId))
  const [editor, setEditor] = useState<{ payment?: Payment } | null>(null)
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
  const isPaid = data.amountOwedCzk <= 0 && data.payments.length > 0
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
      label: t("payment.remaining"),
      amount: data.amountOwedCzk,
      helper: t(isPaid ? "payment.settled" : "payment.unpaid"),
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
              onClick={() => setEditor({ payment: latest })}
            >
              {t(latest ? "payment.edit" : "payment.record")}
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
            className="gap-2 p-6"
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
          isPaid
            ? "border-status-success bg-status-success-bg"
            : latest
              ? "border-status-warning bg-status-warning-bg"
              : "border-primary bg-accent"
        }
      >
        <AlertTitle>
          {t(isPaid ? "payment.recorded" : latest ? "payment.partialTitle" : "payment.waiting", {
            amount: formatCzk(data.amountOwedCzk),
          })}
        </AlertTitle>
        <AlertDescription>
          {latest
            ? t("payment.summary", {
                due: formatCzk(data.amountDueCzk),
                paid: formatCzk(data.amountPaidCzk),
                owed: formatCzk(data.amountOwedCzk),
              })
            : t("payment.waitingDescription", { amount: formatCzk(data.amountDueCzk) })}
        </AlertDescription>
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
                </tr>
              </thead>
              <tbody>
                {data.payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b"
                  >
                    <td className="p-4 whitespace-nowrap">{formatDate(payment.createdAt)}</td>
                    <td className="p-4">{t("payment.manual")}</td>
                    <td className="p-4">
                      <MoneyAmount amountCzk={payment.amountCzk} />
                    </td>
                    <td className="p-4">
                      {t("payment.recordedBy", { name: payment.recordedByName })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {editor ? (
        <PaymentEditor
          application={data}
          payment={editor.payment}
          onClose={() => setEditor(null)}
        />
      ) : null}
    </div>
  )
}
