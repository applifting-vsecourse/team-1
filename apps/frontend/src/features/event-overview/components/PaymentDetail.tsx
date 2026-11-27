import { useState, type ReactNode } from "react"
import type { UseQueryResult } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Seo } from "@/components/atoms/Seo"
import { DetailItem } from "@/components/molecules/DetailItem"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { TermPaymentCard, TermPaymentCards } from "@/components/molecules/TermPaymentCard"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateTime } from "@/lib/date"
import { termLine } from "@/lib/term-label"
import { cn } from "@/lib/utils"

import type {
  Payment,
  PaymentApplication,
  PaymentTerm,
} from "@/features/event-overview/api/payments"
import type { TermStatusDetail } from "@/features/event-overview/api/termStatus"
import { AutoConfirmedNotice } from "@/features/event-overview/components/AutoConfirmedNotice"
import { ParticipantDetails } from "@/features/event-overview/components/ParticipantDetails"
import { PaymentCancellation } from "@/features/event-overview/components/PaymentCancellation"
import { PaymentCorrection } from "@/features/event-overview/components/PaymentCorrection"
import {
  PaymentCorrectionResult,
  type SavedPaymentCorrection,
} from "@/features/event-overview/components/PaymentCorrectionResult"
import { PaymentEditor, type RecordType } from "@/features/event-overview/components/PaymentEditor"

/** Needs attention first, then the paid (collapsed) terms, then the waitlisted ones. */
const cardRank = (term: PaymentTerm): number =>
  term.status === "WAITLISTED" ? 2 : term.paymentStatus === "PAID" ? 1 : 0

/** Confirmed and waitlisted terms, and any other term that holds money (so it is never hidden). */
const isShown = (term: PaymentTerm): boolean =>
  term.status === "CONFIRMED" || term.status === "WAITLISTED" || term.paidCzk !== 0

/**
 * O34: payments of one application under the event's Applications tab — a card per term with
 * what is due, paid and left, the account and the term's variable symbol, a button to record a
 * payment for the term (a refund of the overpayment when the term is overpaid), and the payment history. A paid term is a collapsed card. On a phone the
 * cards stack and the history becomes a list (M13).
 */
// Figma v2: US-111 Detail plateb · dva přeplatky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=21524-71534 (360 px: node-id=21524-71833)
// Figma v2: US-111 Detail plateb · dluh po termínech · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=21524-70991 (360 px: node-id=21524-71302)
// Figma v2: US-112 Historie plateb · akce Upravit · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=21569-72401 (360 px: node-id=21569-72747)
// Figma (Design system): US-38 card "Individuální ubytování" · with request desktop https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=25587-110703 (mobile: 25587-110821); without 25587-110890 (mobile: 25587-111008)
export function PaymentDetail({
  applicationId,
  query: { data, isPending, error, refetch },
  termStatuses,
}: {
  applicationId: string
  query: UseQueryResult<PaymentApplication>
  termStatuses: TermStatusDetail[] | undefined
}) {
  const { t } = useTranslation("eventOverview")
  // The record dialog: for one term or the whole application, opened on a payment or a refund.
  const [editor, setEditor] = useState<{ term?: PaymentTerm; type: RecordType } | null>(null)
  const [paymentToCancel, setPaymentToCancel] = useState<Payment | null>(null)
  const [paymentToCorrect, setPaymentToCorrect] = useState<Payment | null>(null)
  const [savedCorrection, setSavedCorrection] = useState<SavedPaymentCorrection | null>(null)
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
  if (savedCorrection) {
    return (
      <div className="flex flex-col gap-4">
        <Seo title={t("payment.correctionResult")} />
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
          {data.firstName} {data.lastName}
        </h2>
        <PaymentCorrectionResult
          application={data}
          correction={savedCorrection}
          onBack={() => setSavedCorrection(null)}
        />
      </div>
    )
  }
  const terms = data.terms.filter(isShown).sort((a, b) => cardRank(a) - cardRank(b))
  // A term the backend reports an overpayment for is refunded, not paid (#399).
  const hasOverpayment = data.refundableTermId !== null
  const hasConfirmedTerm = data.terms.some((term) => term.status === "CONFIRMED")

  return (
    <div className="flex flex-col gap-4">
      <Seo title={t("payment.title")} />
      <div className="flex items-start gap-4 md:gap-6">
        <BackLink
          to={ROUTES.organizer.eventApplications}
          params={{ eventId: data.eventId }}
        >
          {t("payment.back")}
        </BackLink>
        <div className="flex min-w-0 flex-1 flex-col gap-3 wrap-anywhere md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
              {data.firstName} {data.lastName}
            </h2>
            <p>
              {data.eventName} · {t("payment.applicationCode", { code: data.code })}
            </p>
          </div>
        </div>
      </div>
      <AutoConfirmedNotice
        applicationId={applicationId}
        firstName={data.firstName}
        gender={data.gender}
        terms={termStatuses}
      />
      <ParticipantDetails application={data} />
      {/* US-38: who asked to settle the accommodation individually, with the note; only for organizers. Hidden when nobody asked (#544). */}
      {data.individualAccommodation ? (
        <Card
          role="group"
          aria-label={t("payment.individualAccommodation")}
          className="gap-3 p-4"
        >
          <h3 className="text-lg font-semibold">{t("payment.individualAccommodation")}</h3>
          <DetailItem
            label={t("payment.individualAccommodationNote")}
            className="whitespace-pre-wrap"
          >
            {data.accommodationRequest ?? t("payment.individualAccommodationNoNote")}
          </DetailItem>
        </Card>
      ) : null}
      {/* Nothing to pay without a confirmed term (US-25): record a payment once a place is confirmed. */}
      {hasConfirmedTerm ? null : (
        <Alert className="border-status-info bg-status-info-bg">
          <AlertTitle className="line-clamp-none">{t("payment.nothingDueTitle")}</AlertTitle>
          <AlertDescription>{t("payment.nothingDueDescription")}</AlertDescription>
        </Alert>
      )}
      {terms.length > 0 ? (
        <Card
          role="group"
          aria-label={t("payment.wholeApplicationTitle")}
          className="gap-3 p-4"
        >
          <h3 className="text-xl font-bold tracking-tight md:text-2xl">
            {t("payment.wholeApplicationTitle")}
          </h3>
          <dl className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <SummaryItem label={t("payment.due")}>
              <MoneyAmount amountCzk={data.amountDueCzk} />
            </SummaryItem>
            <SummaryItem label={t("payment.paid")}>
              <MoneyAmount amountCzk={data.amountPaidCzk} />
            </SummaryItem>
            <SummaryItem label={t("payment.remainingToPay")}>
              <MoneyAmount amountCzk={data.payableCzk} />
            </SummaryItem>
            {/* The whole application's overpayment is exact only when no term still owes. */}
            {data.payableCzk === 0 && data.amountOwedCzk < 0 ? (
              <SummaryItem label={t("payment.overpaid")}>
                <MoneyAmount amountCzk={-data.amountOwedCzk} />
              </SummaryItem>
            ) : null}
          </dl>
        </Card>
      ) : null}
      <TermPaymentCards>
        {terms.map((term) => (
          <TermPaymentCard
            key={term.termId}
            title={termLine(term)}
            // A waitlisted term that still holds money keeps its payment status (D-088).
            status={
              term.status === "WAITLISTED" && term.paidCzk === 0 ? "WAITLISTED" : term.paymentStatus
            }
            dueCzk={term.dueCzk}
            paidCzk={term.paidCzk}
            owedCzk={term.owedCzk}
            bankAccount={data.bankAccount}
            variableSymbol={term.variableSymbol}
            action={
              // Also after the term is paid: a payment sent by mistake is recorded as an overpayment.
              term.status === "WAITLISTED" && term.paidCzk === 0 ? null : term.refundableCzk > 0 ? (
                <Button
                  size="lg"
                  className="min-h-12 w-full"
                  onClick={() => setEditor({ term, type: "refund" })}
                >
                  {t("payment.returnOverpayment")}
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="min-h-12 w-full"
                  onClick={() => setEditor({ term, type: "payment" })}
                >
                  {t("payment.recordForTerm")}
                </Button>
              )
            }
          />
        ))}
      </TermPaymentCards>
      {hasConfirmedTerm || hasOverpayment ? (
        // One payment split over the terms, or a refund of an overpayment (Figma "Akce plateb").
        <div className="grid gap-x-4 gap-y-2 md:grid-cols-2">
          {hasConfirmedTerm ? (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setEditor({ type: "payment" })}
            >
              {t("payment.record")}
            </Button>
          ) : null}
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="lg"
              disabled={!hasOverpayment}
              aria-describedby={hasOverpayment ? undefined : "refund-unavailable"}
              onClick={() => setEditor({ type: "refund" })}
            >
              {t("payment.recordRefundAction")}
            </Button>
            {hasOverpayment ? null : (
              <p
                id="refund-unavailable"
                className="text-center text-sm text-muted-foreground"
              >
                {t("payment.refundUnavailableHint")}
              </p>
            )}
          </div>
        </div>
      ) : null}
      <Card className="gap-3 p-4">
        <h2 className="text-xl font-bold tracking-tight md:text-2xl">{t("payment.history")}</h2>
        {data.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("payment.empty")}</p>
        ) : (
          <PaymentHistory
            label={t("payment.history")}
            payments={data.payments}
            terms={data.terms}
            onCancel={setPaymentToCancel}
            onCorrect={setPaymentToCorrect}
          />
        )}
      </Card>
      {paymentToCancel ? (
        <PaymentCancellation
          application={data}
          payment={paymentToCancel}
          onClose={() => setPaymentToCancel(null)}
        />
      ) : null}
      {paymentToCorrect ? (
        <PaymentCorrection
          application={data}
          payment={paymentToCorrect}
          onSaved={(amountCzk, termId) =>
            setSavedCorrection({ original: paymentToCorrect, amountCzk, termId })
          }
          onClose={() => setPaymentToCorrect(null)}
        />
      ) : null}
      {editor ? (
        <PaymentEditor
          application={data}
          term={editor.term}
          initialType={editor.type}
          onClose={() => setEditor(null)}
        />
      ) : null}
    </div>
  )
}

/** One line per term a receipt was split to: type and amount, the term, who recorded it and when. */
function PaymentHistory({
  label,
  payments,
  terms,
  onCancel,
  onCorrect,
}: {
  label: string
  payments: Payment[]
  terms: PaymentTerm[]
  onCancel: (payment: Payment) => void
  onCorrect: (payment: Payment) => void
}) {
  const { t } = useTranslation("eventOverview")
  const lines = payments.flatMap((payment) =>
    payment.rows.map((row) => ({
      payment,
      amountCzk: row.amountCzk,
      term: terms.find((candidate) => candidate.termId === row.termId),
    })),
  )

  return (
    <ul
      aria-label={label}
      className="flex flex-col"
    >
      {lines.map(({ payment, amountCzk, term }) => (
        <li
          key={`${payment.id}-${term?.termId ?? amountCzk}`}
          className={cn(
            "flex flex-col gap-2 border-t py-3 first:border-t-0 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between",
            payment.cancelledAt && "text-muted-foreground",
          )}
        >
          <div className="flex min-w-0 flex-col gap-1">
            <p>
              {t(amountCzk < 0 ? "payment.refundMethod" : "payment.manual")} ·{" "}
              <MoneyAmount
                amountCzk={amountCzk}
                className={cn(amountCzk < 0 && "text-status-warning")}
              />
              {payment.cancelledAt ? (
                <span className="ml-2 text-sm text-muted-foreground">
                  {t(
                    payments.some((item) => item.correctsReceiptId === payment.id)
                      ? "payment.correctedOriginal"
                      : "payment.cancelledHistory",
                  )}
                </span>
              ) : payment.correctsReceiptId ? (
                <span className="ml-2 text-sm text-muted-foreground">
                  {t("payment.correctionHistory")}
                </span>
              ) : null}
            </p>
            {term ? <p className="text-sm text-muted-foreground">{termLine(term)}</p> : null}
            <p className="text-sm text-muted-foreground">
              {t("payment.recordedBy", {
                name: payment.recordedByName,
                date: formatDateTime(payment.createdAt),
              })}
            </p>
          </div>
          {payment.cancelledAt ? null : (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                onClick={() => onCorrect(payment)}
              >
                {t("payment.correctRecord")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => onCancel(payment)}
              >
                {t("payment.cancelRecord")}
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

function SummaryItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
