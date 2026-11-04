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
import { TermPaymentCard, TermPaymentCards } from "@/components/molecules/TermPaymentCard"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/date"
import { termDates } from "@/lib/term-label"
import { cn } from "@/lib/utils"

import {
  paymentQueryOptions,
  type Payment,
  type PaymentTerm,
} from "@/features/event-overview/api/payments"
import { PaymentCancellation } from "@/features/event-overview/components/PaymentCancellation"
import { PaymentEditor } from "@/features/event-overview/components/PaymentEditor"

/** Needs attention first, then the paid (collapsed) terms, then the waitlisted ones. */
const cardRank = (term: PaymentTerm): number =>
  term.status === "WAITLISTED" ? 2 : term.paymentStatus === "PAID" ? 1 : 0

/** Confirmed and waitlisted terms, and any other term that holds money (so it is never hidden). */
const isShown = (term: PaymentTerm): boolean =>
  term.status === "CONFIRMED" || term.status === "WAITLISTED" || term.paidCzk !== 0

/**
 * O34: payments of one application under the event's Applications tab — a card per term with
 * what is due, paid and left, the account and the term's variable symbol, a button to record a
 * payment for the term, and the payment history. A paid term is a collapsed card. On a phone the
 * cards stack and the history becomes a list (M13).
 */
// Figma (Design system): Detail přihlášky · Platby · Organizátor · dluh po termínech · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15845-7697 (360 px: node-id=15845-7814)
// Figma (Design system): O34 Detail platby, bez potvrzeného termínu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16487-6805
export function PaymentDetail({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation("eventOverview")
  const { data, isPending, error, refetch } = useQuery(paymentQueryOptions(applicationId))
  const [termToPay, setTermToPay] = useState<PaymentTerm | null>(null)
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
  const terms = data.terms.filter(isShown).sort((a, b) => cardRank(a) - cardRank(b))
  // A refund is taken from one term, so any overpaid term opens it.
  const hasOverpayment = data.terms.some((term) => term.owedCzk < 0)
  const hasConfirmedTerm = data.terms.some((term) => term.status === "CONFIRMED")

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
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
              {data.firstName} {data.lastName} · {data.code}
            </h2>
            <p className="text-sm text-muted-foreground">{t("payment.description")}</p>
          </div>
          {hasOverpayment ? (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsRefundOpen(true)}
            >
              {t("payment.refund")}
            </Button>
          ) : null}
        </div>
      </div>
      {/* Nothing to pay without a confirmed term (US-25): record a payment once a place is confirmed. */}
      {hasConfirmedTerm ? null : (
        <Alert className="border-status-info bg-status-info-bg">
          <AlertTitle className="line-clamp-none">{t("payment.nothingDueTitle")}</AlertTitle>
          <AlertDescription>{t("payment.nothingDueDescription")}</AlertDescription>
        </Alert>
      )}
      <TermPaymentCards>
        {terms.map((term) => (
          <TermPaymentCard
            key={term.termId}
            title={termDates(term)}
            status={term.status === "WAITLISTED" ? "WAITLISTED" : term.paymentStatus}
            dueCzk={term.dueCzk}
            paidCzk={term.paidCzk}
            owedCzk={term.owedCzk}
            bankAccount={data.bankAccount}
            variableSymbol={term.variableSymbol}
            action={
              term.owedCzk > 0 ? (
                <Button
                  size="lg"
                  onClick={() => setTermToPay(term)}
                >
                  {t("payment.recordForTerm")}
                </Button>
              ) : null
            }
          />
        ))}
      </TermPaymentCards>
      <Card className="gap-4 p-4 md:p-6">
        <h2 className="text-lg font-semibold">{t("payment.history")}</h2>
        {data.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("payment.empty")}</p>
        ) : (
          <PaymentHistory
            payments={data.payments}
            terms={data.terms}
            onCancel={setPaymentToCancel}
          />
        )}
      </Card>
      {termToPay ? (
        <PaymentEditor
          application={data}
          term={termToPay}
          onClose={() => setTermToPay(null)}
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

/** One line per term a receipt was split to; a table from md up, on a phone a stacked list. */
function PaymentHistory({
  payments,
  terms,
  onCancel,
}: {
  payments: Payment[]
  terms: PaymentTerm[]
  onCancel: (payment: Payment) => void
}) {
  const { t } = useTranslation("eventOverview")
  const detail = "text-xs text-muted-foreground md:text-sm md:text-foreground"
  const lines = payments.flatMap((payment) =>
    payment.rows.map((row) => ({
      payment,
      amountCzk: row.amountCzk,
      term: terms.find((candidate) => candidate.termId === row.termId),
    })),
  )

  return (
    <table className="w-full text-left text-sm">
      <thead className="hidden text-xs text-muted-foreground md:table-header-group">
        <tr className="bg-muted">
          <th className="h-10 rounded-l-md px-3 font-medium">{t("payment.date")}</th>
          <th className="h-10 px-3 font-medium">{t("payment.term")}</th>
          <th className="h-10 px-3 font-medium">{t("payment.method")}</th>
          <th className="h-10 px-3 text-right font-medium">{t("payment.historyAmount")}</th>
          <th className="h-10 px-3 font-medium">{t("payment.recorder")}</th>
          <th className="h-10 rounded-r-md px-3">
            <span className="sr-only">{t("payment.cancelRecord")}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {lines.map(({ payment, amountCzk, term }) => (
          <tr
            key={`${payment.id}-${term?.termId ?? amountCzk}`}
            className="grid grid-cols-[minmax(0,1fr)_auto] border-b py-2 last:border-b-0 md:table-row"
          >
            <td className={cn("col-start-1 row-start-2 md:px-3 md:py-4", detail)}>
              {formatDate(payment.createdAt)}
            </td>
            <td className={cn("col-start-1 row-start-3 md:px-3 md:py-4", detail)}>
              {term ? termDates(term) : null}
            </td>
            <td className={cn("col-start-1 row-start-4 md:px-3 md:py-4", detail)}>
              {t(amountCzk < 0 ? "payment.refundMethod" : "payment.manual")}
            </td>
            <td className="col-start-1 row-start-1 font-semibold md:px-3 md:py-4 md:text-right">
              <MoneyAmount
                amountCzk={amountCzk}
                className={cn(amountCzk < 0 && "text-status-warning")}
              />
            </td>
            <td className={cn("col-start-1 row-start-5 md:px-3 md:py-4", detail)}>
              {payment.recordedByName}
            </td>
            <td className="col-start-2 row-span-5 row-start-1 self-center text-right md:px-3 md:py-2">
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
