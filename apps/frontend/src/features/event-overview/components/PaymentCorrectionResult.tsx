import { ArrowLeft, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateTime } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { termDates } from "@/lib/term-label"

import type { Payment, PaymentApplication } from "@/features/event-overview/api/payments"

export type SavedPaymentCorrection = { original: Payment; amountCzk: number; termId?: string }

// Figma: US-112 · Výsledek opravy · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15883-7820 (360 px: 15883-7897; moved: 15883-8027; refund: 15883-8157)
export function PaymentCorrectionResult({
  application,
  correction,
  onBack,
}: {
  application: PaymentApplication
  correction: SavedPaymentCorrection
  onBack: () => void
}) {
  const { t } = useTranslation("eventOverview")
  const replacement = application.payments.find(
    (payment) => payment.correctsReceiptId === correction.original.id && !payment.cancelledAt,
  )
  const affectedIds = new Set([
    ...correction.original.rows.map((row) => row.termId),
    ...(replacement?.rows.map((row) => row.termId) ?? []),
  ])
  const affectedTerms = application.terms.filter((term) => affectedIds.has(term.termId))
  const termLabel = (termId?: string) => {
    const term = application.terms.find((candidate) => candidate.termId === termId)
    return term ? ` · ${termDates(term)}` : ""
  }
  const type = t(correction.original.amountCzk < 0 ? "payment.typeRefund" : "payment.typePayment")
  return (
    <Card className="gap-4 p-4 md:p-6">
      <h2 className="text-2xl font-semibold">{t("payment.correctionResult")}</h2>
      <Alert className="border-border bg-status-success-bg">
        <TriangleAlert className="size-5" />
        <AlertTitle className="line-clamp-none">{t("payment.correctionSaved")}</AlertTitle>
        <AlertDescription>{t("payment.correctionSavedDescription")}</AlertDescription>
      </Alert>
      <dl className="flex flex-col gap-4">
        {affectedTerms.map((term) => (
          <div key={term.termId}>
            <dt className="mb-2 text-sm text-muted-foreground">{termDates(term)}</dt>
            <dd>
              {t("payment.correctionBalance", {
                paid: formatCzk(term.paidCzk),
                balanceLabel: t(
                  term.owedCzk < 0 ? "payment.correctionOverpayment" : "payment.correctionDebt",
                ),
                owed: formatCzk(Math.abs(term.owedCzk)),
              })}
            </dd>
          </div>
        ))}
      </dl>
      <h3 className="text-2xl font-semibold">{t("payment.correctionAudit")}</h3>
      <dl className="flex flex-col gap-4">
        <div>
          <dt className="mb-2 text-sm text-muted-foreground">{t("payment.originalShort")}</dt>
          <dd>
            {type} {formatCzk(Math.abs(correction.original.amountCzk))}
            {correction.original.isSummary === true || correction.original.rows.length !== 1
              ? ""
              : termLabel(correction.original.rows[0]?.termId)}
          </dd>
        </div>
        <div>
          <dt className="mb-2 text-sm text-muted-foreground">{t("payment.newShort")}</dt>
          <dd>
            {type} {formatCzk(correction.amountCzk)}
            {termLabel(correction.termId)}
          </dd>
        </div>
        {replacement ? (
          <div>
            <dt className="mb-2 text-sm text-muted-foreground">{t("payment.correctionAuthor")}</dt>
            <dd>
              {replacement.recordedByName} · {formatDateTime(replacement.createdAt)}
            </dd>
          </div>
        ) : null}
      </dl>
      <Button
        variant="secondary"
        className="self-start rounded-full"
        onClick={onBack}
      >
        <ArrowLeft /> {t("payment.backToPayments")}
      </Button>
    </Card>
  )
}
