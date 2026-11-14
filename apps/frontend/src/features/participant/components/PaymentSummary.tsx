import { useTranslation } from "react-i18next"

import { TermPaymentCard, TermPaymentCards } from "@/components/molecules/TermPaymentCard"
import { Card } from "@/components/ui/card"
import { formatCzk } from "@/lib/money"
import { termDatesLine } from "@/lib/term-label"

import type { MyApplication } from "@/features/participant/api/applications"
import { SimulatePaymentButton } from "@/features/participant/components/SimulatePaymentButton"
import { SummaryPaymentDetails } from "@/features/participant/components/SummaryPaymentDetails"
import { TermPaymentQr } from "@/features/participant/components/TermPaymentQr"

type PaymentSummaryProps = {
  application: MyApplication
}

/** Application-wide payment details followed by one card for every selected term. */
// Figma (Design system): US-115 / Detail přihlášky · Platby · simulace · Návrh A · simulace termínu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15954-1005 (360 px: node-id=15954-1133)
// Figma (Design system): US-115 / Detail přihlášky · Platby · simulace · Výsledek návrhu A · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15954-1446 (360 px: node-id=15954-1551)
// Figma (Design system): #311 Moje přihláška · Přeplatek a dluh · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19799-15947 (360 px: node-id=19799-16073)
// Figma (Design system): Detail přihlášky · Platby · Dluh 500 + 700 Kč · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15845-628 (360 px: node-id=15845-736)
// Figma (Design system): Detail přihlášky · Platby · První termín zaplacený · druhý nově potvrzený · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15845-463 (360 px: node-id=15845-563)
// Figma (Design system): Detail přihlášky · Platby · Více nově potvrzených · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19446-21743 (360 px: node-id=19446-21892)
// Figma (Design system): Detail přihlášky · Platby · Oba termíny zaplacené #203 · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19446-22050 (360 px: node-id=19446-22404)
// Figma (Design system): Detail přihlášky · Platby · Jeden termín rozbalený #203 · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19446-22213 (360 px: node-id=19446-22517)
// Figma (Design system): Detail přihlášky · Platby · Náhradník v jednom termínu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19448-8297 (360 px: node-id=19448-8571)
// Figma (Design system): Detail přihlášky · Platby · Náhradník ve všech termínech · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19448-8453 (360 px: node-id=19448-8677)
export function PaymentSummary({ application }: PaymentSummaryProps) {
  const { t } = useTranslation("participant")
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
  const otherTerms = application.terms.filter((term) => term.status !== "CONFIRMED")

  const simulatedPayments = application.simulatedPayments

  return (
    <div className="flex flex-col gap-6">
      {paymentDetails && paymentDetails.summary.payableCzk > 0 ? (
        <SummaryPaymentDetails application={application} />
      ) : null}
      <TermPaymentCards isSingleColumn>
        {confirmed.map(({ payment, term }, index) => (
          <div
            key={payment.termId}
            className="flex flex-col gap-4"
          >
            <TermPaymentCard
              title={termDatesLine(term)}
              status={payment.paymentStatus}
              dueCzk={payment.dueCzk}
              paidCzk={payment.paidCzk}
              owedCzk={payment.owedCzk}
              bankAccount={paymentDetails?.bankAccount ?? ""}
              variableSymbol={payment.variableSymbol}
              paymentDeadline={payment.paymentDeadline}
              isInitiallyOpen={index === 0 && payment.owedCzk !== 0}
              note={
                payment.owedCzk < 0 ? (
                  <p className="text-sm">{t("payment.overpaymentRefund")}</p>
                ) : null
              }
              qr={
                <TermPaymentQr
                  bankAccount={paymentDetails?.bankAccount ?? ""}
                  owedCzk={payment.owedCzk}
                  variableSymbol={payment.variableSymbol}
                  eventName={application.eventName}
                />
              }
            />
            {application.canSimulatePayment && payment.owedCzk > 0 ? (
              <SimulatePaymentButton
                applicationId={application.id}
                termId={payment.termId}
              />
            ) : null}
          </div>
        ))}
        {otherTerms.map((term) => (
          <TermPaymentCard
            key={term.termId}
            title={termDatesLine(term)}
            isStatusSeparate
            status={term.status === "CONFIRMED" ? "NOTHING_DUE" : term.status}
            dueCzk={0}
            paidCzk={0}
            owedCzk={0}
            bankAccount=""
            variableSymbol=""
          />
        ))}
      </TermPaymentCards>
      {simulatedPayments.length > 0 ? (
        <Card className="gap-2 p-6">
          <h2 className="text-lg font-semibold">{t("payment.simulation.logTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("payment.simulation.logDescription")}</p>
          <ul>
            {simulatedPayments.map((payment) => {
              const term = application.terms.find(({ termId }) => termId === payment.termId)
              return (
                <li key={payment.createdAt + payment.termId}>
                  {t("payment.simulation.logLine", {
                    amount: formatCzk(payment.amountCzk),
                    term: term ? termDatesLine(term) : "",
                  })}
                </li>
              )
            })}
          </ul>
        </Card>
      ) : null}
    </div>
  )
}
