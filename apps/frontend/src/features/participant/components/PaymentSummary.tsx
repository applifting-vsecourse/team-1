import { useState } from "react"
import { useTranslation } from "react-i18next"

import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { TermPaymentCard, TermPaymentCards } from "@/components/molecules/TermPaymentCard"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { termDatesLine } from "@/lib/term-label"

import type { MyApplication } from "@/features/participant/api/applications"
import { SummaryPaymentDialog } from "@/features/participant/components/SummaryPaymentDialog"
import { summaryPaymentSpayd } from "@/features/participant/lib/payment-qr"

type PaymentSummaryProps = {
  application: MyApplication
}

/**
 * What is due, paid and left for each term, with the account and the variable symbol of the term
 * (US-110). Terms that need a payment come first, paid ones (collapsed) after them and waitlisted
 * ones, which only say nothing is paid yet, last. Terms still to be evaluated or cancelled are
 * not shown here, and nothing is when no term is confirmed or waitlisted.
 */
// Figma (Design system): Detail přihlášky · Platby · Dluh 500 + 700 Kč · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15845-628 (360 px: node-id=15845-736)
// Figma (Design system): Detail přihlášky · Platby · První termín zaplacený · druhý nově potvrzený · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15845-463 (360 px: node-id=15845-563)
// Figma (Design system): Detail přihlášky · Platby · Více nově potvrzených · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19446-21743 (360 px: node-id=19446-21892)
// Figma (Design system): Detail přihlášky · Platby · Oba termíny zaplacené #203 · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19446-22050 (360 px: node-id=19446-22404)
// Figma (Design system): Detail přihlášky · Platby · Jeden termín rozbalený #203 · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19446-22213 (360 px: node-id=19446-22517)
// Figma (Design system): Detail přihlášky · Platby · Náhradník v jednom termínu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19448-8297 (360 px: node-id=19448-8571)
// Figma (Design system): Detail přihlášky · Platby · Náhradník ve všech termínech · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19448-8453 (360 px: node-id=19448-8677)
export function PaymentSummary({ application }: PaymentSummaryProps) {
  const { t } = useTranslation("participant")
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)
  const { paymentDetails } = application

  const confirmed = (paymentDetails?.terms ?? [])
    .flatMap((payment) => {
      const term = application.terms.find(({ termId }) => termId === payment.termId)
      return term ? [{ payment, term }] : []
    })
    .sort(
      (a, b) =>
        Number(a.payment.paymentStatus === "PAID") - Number(b.payment.paymentStatus === "PAID"),
    )
  const waitlisted = application.terms.filter((term) => term.status === "WAITLISTED")
  if (confirmed.length === 0 && waitlisted.length === 0) return null

  // The total and the hint only matter when more than one term is to be paid.
  const termsWithDebt = confirmed.filter(({ payment }) => payment.owedCzk > 0).length
  const payableCzk = paymentDetails?.summary.payableCzk ?? 0
  const canShowSummaryQr =
    paymentDetails !== null &&
    confirmed.length > 1 &&
    summaryPaymentSpayd(
      paymentDetails.bankAccount,
      payableCzk,
      paymentDetails.summary.variableSymbol,
    ) !== null

  return (
    <div className="flex flex-col gap-6">
      {confirmed.length > 1 && payableCzk > 0 ? (
        <Card className="gap-2 p-6">
          <h2 className="text-lg font-semibold">{t("payment.totalOwed")}</h2>
          <MoneyAmount
            amountCzk={payableCzk}
            className="text-2xl font-semibold"
          />
          {canShowSummaryQr ? (
            <Button
              type="button"
              size="lg"
              className="mt-4 w-full sm:w-auto sm:self-start"
              onClick={() => setIsSummaryOpen(true)}
            >
              {t(confirmed.length === 2 ? "payment.showSummaryQrTwo" : "payment.showSummaryQrMany")}
            </Button>
          ) : null}
        </Card>
      ) : null}
      {termsWithDebt > 1 ? <p>{t("payment.payEachTerm")}</p> : null}
      <TermPaymentCards>
        {confirmed.map(({ payment, term }) => (
          <TermPaymentCard
            key={payment.termId}
            title={termDatesLine(term)}
            status={payment.paymentStatus}
            dueCzk={payment.dueCzk}
            paidCzk={payment.paidCzk}
            owedCzk={payment.owedCzk}
            bankAccount={paymentDetails?.bankAccount ?? ""}
            variableSymbol={payment.variableSymbol}
          />
        ))}
        {waitlisted.map((term) => (
          <TermPaymentCard
            key={term.termId}
            title={termDatesLine(term)}
            status="WAITLISTED"
            dueCzk={0}
            paidCzk={0}
            owedCzk={0}
            bankAccount=""
            variableSymbol=""
          />
        ))}
      </TermPaymentCards>
      {isSummaryOpen && canShowSummaryQr ? (
        <SummaryPaymentDialog
          application={application}
          onClose={() => setIsSummaryOpen(false)}
        />
      ) : null}
    </div>
  )
}
