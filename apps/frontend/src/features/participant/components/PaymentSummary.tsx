import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { CopyButton } from "@/components/atoms/CopyButton"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Card } from "@/components/ui/card"
import { termLine } from "@/lib/term-label"
import { cn } from "@/lib/utils"

import type { MyApplication } from "@/features/participant/api/applications"
import { PaymentStatusBadge } from "@/features/participant/components/TermSummary"
import { termRange } from "@/features/participant/lib/format"

type PaymentSummaryProps = {
  application: MyApplication
}

/** What is due, what is paid and where to send the rest — only for applications with a confirmed term (US-25). */
// Figma (Design system): U04 Moje přihláška, blok „Platba za potvrzený termín“ · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12926-110
// Figma (Design system): U04p Moje přihláška, dva potvrzené termíny · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16116-2 (360 px: node-id=16186-299)
// Figma (Design system): U04q Moje přihláška, jeden potvrzený termín · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16186-2
export function PaymentSummary({ application }: PaymentSummaryProps) {
  const { t } = useTranslation(["participant", "common"])
  const { paymentDetails, amountDueCzk, amountPaidCzk, amountOwedCzk } = application
  if (!paymentDetails) return null

  const isOverpaid = amountOwedCzk < 0
  const hasToPay = amountOwedCzk > 0
  // Something is still to be sent even when an overpaid term makes the whole balance negative.
  const isPayable = paymentDetails.summary.payableCzk > 0
  const waitlisted = application.terms.filter((term) => term.status === "WAITLISTED")
  // With several confirmed terms the application can be paid as a whole or one term at a time.
  const termPayments = paymentDetails.terms.length > 1 ? paymentDetails.terms : []
  const note = [
    isPayable ? t("payment.note") : null,
    termPayments.length > 0 ? t("payment.chooseSymbol") : null,
    waitlisted.length > 0
      ? t("payment.waitlistedNote", { range: waitlisted.map(termRange).join(", ") })
      : null,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-2xl font-semibold">{t("payment.title")}</h2>
        <PaymentStatusBadge status={application.paymentStatus} />
      </div>
      <dl className="grid gap-4 sm:grid-cols-3 sm:gap-6">
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
          isHighlighted={hasToPay}
        />
      </dl>
      <Card className="gap-0 p-6">
        <h3 className="pb-4 text-lg font-semibold">
          {isPayable ? t("payment.transferTitle") : t("payment.detailsTitle")}
        </h3>
        <dl>
          <Detail label={t("payment.account")}>
            <span className="break-all">{paymentDetails.bankAccount}</span>
            <CopyButton
              value={paymentDetails.bankAccount}
              label={t("common:clipboard.copyAccount")}
            />
          </Detail>
        </dl>
        {termPayments.length > 0 ? (
          <h4 className="pt-4 font-semibold">{t("payment.wholeApplication")}</h4>
        ) : null}
        <dl>
          <VariableSymbolRows
            variableSymbol={paymentDetails.summary.variableSymbol}
            toPayCzk={paymentDetails.summary.payableCzk}
            isToPayShown={termPayments.length > 0 || isPayable}
          />
        </dl>
        {termPayments.map((payment) => {
          const term = application.terms.find(({ termId }) => termId === payment.termId)
          return (
            <section key={payment.termId}>
              <h4 className="pt-4 font-semibold">
                {term ? termLine(term) : payment.variableSymbol}
              </h4>
              <dl>
                <VariableSymbolRows
                  variableSymbol={payment.variableSymbol}
                  toPayCzk={Math.max(0, payment.owedCzk)}
                  isToPayShown
                />
              </dl>
            </section>
          )
        })}
        {note ? <p className="pt-4 text-sm text-muted-foreground">{note}</p> : null}
      </Card>
    </section>
  )
}

// Figma DS / Metric Tone=Default, without the helper line.
function Metric({
  label,
  amountCzk,
  isHighlighted = false,
}: {
  label: string
  amountCzk: number
  isHighlighted?: boolean
}) {
  return (
    <Card
      className={cn("gap-2 p-6", isHighlighted && "border-status-warning bg-status-warning-bg")}
    >
      <dt
        className={cn(
          "text-xs font-medium text-muted-foreground",
          isHighlighted && "text-status-warning",
        )}
      >
        {label}
      </dt>
      <dd className={cn("text-4xl/11 font-bold", isHighlighted && "text-status-warning")}>
        <MoneyAmount amountCzk={amountCzk} />
      </dd>
    </Card>
  )
}

function VariableSymbolRows({
  variableSymbol,
  toPayCzk,
  isToPayShown,
}: {
  variableSymbol: string
  toPayCzk: number
  isToPayShown: boolean
}) {
  const { t } = useTranslation(["participant", "common"])
  return (
    <>
      <Detail label={t("payment.variableSymbol")}>
        <span className="break-all">{variableSymbol}</span>
        <CopyButton
          value={variableSymbol}
          label={t("common:clipboard.copyVariableSymbol")}
        />
      </Detail>
      {isToPayShown ? (
        <Detail label={t("payment.toPay")}>
          <MoneyAmount amountCzk={toPayCzk} />
        </Detail>
      ) : null}
    </>
  )
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t py-4 sm:flex-row sm:items-center sm:gap-4">
      <dt className="text-muted-foreground sm:w-50 sm:shrink-0">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2 text-sm font-medium">{children}</dd>
    </div>
  )
}
