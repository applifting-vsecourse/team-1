import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Card } from "@/components/ui/card"

import type { MyApplication } from "@/features/participant/api/applications"
import { termRange } from "@/features/participant/lib/format"

type PaymentSummaryProps = {
  application: MyApplication
}

/** What is due, what is paid and where to send the rest — only for applications with a confirmed term (US-25). */
// Figma (Design system): U04 Moje přihláška, blok „Platba za potvrzený termín“ · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12926-110
export function PaymentSummary({ application }: PaymentSummaryProps) {
  const { t } = useTranslation("participant")
  const { paymentDetails, amountDueCzk, amountPaidCzk, amountOwedCzk } = application
  if (!paymentDetails) return null

  const isOverpaid = amountOwedCzk < 0
  const hasToPay = amountOwedCzk > 0
  const waitlisted = application.terms.filter((term) => term.status === "WAITLISTED")
  const note = [
    hasToPay ? t("payment.note") : null,
    waitlisted.length > 0
      ? t("payment.waitlistedNote", { range: waitlisted.map(termRange).join(", ") })
      : null,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold">{t("payment.title")}</h2>
      <dl className="grid gap-6 sm:grid-cols-3">
        <Metric
          label={t("payment.due")}
          amountCzk={amountDueCzk}
        />
        <Metric
          label={t("payment.paid")}
          amountCzk={amountPaidCzk}
        />
        <Metric
          label={isOverpaid ? t("payment.overpaid") : t("payment.owed")}
          amountCzk={Math.abs(amountOwedCzk)}
        />
      </dl>
      <Card className="gap-0 p-6">
        <h3 className="pb-4 text-lg font-semibold">
          {hasToPay ? t("payment.transferTitle") : t("payment.detailsTitle")}
        </h3>
        <dl>
          <Detail label={t("payment.account")}>{paymentDetails.bankAccount}</Detail>
          <Detail label={t("payment.variableSymbol")}>{paymentDetails.variableSymbol}</Detail>
          {hasToPay ? (
            <Detail label={t("payment.toPay")}>
              <MoneyAmount amountCzk={amountOwedCzk} />
            </Detail>
          ) : null}
        </dl>
        {note ? <p className="pt-2 text-sm text-muted-foreground">{note}</p> : null}
      </Card>
    </section>
  )
}

// Figma DS / Metric Tone=Default, without the helper line.
function Metric({ label, amountCzk }: { label: string; amountCzk: number }) {
  return (
    <Card className="gap-2 p-6">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-3xl font-bold">
        <MoneyAmount amountCzk={amountCzk} />
      </dd>
    </Card>
  )
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t py-4 sm:flex-row sm:items-center sm:gap-4">
      <dt className="text-muted-foreground sm:w-50 sm:shrink-0">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}
