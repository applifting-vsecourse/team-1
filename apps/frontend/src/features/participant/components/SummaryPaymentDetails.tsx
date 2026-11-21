import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { CopyButton } from "@/components/atoms/CopyButton"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { PaymentQrDownload } from "@/components/molecules/PaymentQrDownload"
import { Card } from "@/components/ui/card"
import { formatDateRange } from "@/lib/date"
import { summaryPaymentSpayd } from "@/lib/payment-qr"

import type { MyApplication } from "@/features/participant/api/applications"

type Props = { application: MyApplication }

// Figma (Design system v2): #311 Moje přihláška · Dluh ve dvou termínech · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22448-25936 (360 px: node-id=22448-26089)
export function SummaryPaymentDetails({ application }: Props) {
  const { t } = useTranslation(["participant", "common"])
  const details = application.paymentDetails!
  const amountCzk = details.summary.payableCzk
  const owedTerms = details.terms
    .filter((term) => term.owedCzk > 0)
    .map((payment) => ({
      ...payment,
      term: application.terms.find(({ termId }) => termId === payment.termId),
    }))
  const spayd = summaryPaymentSpayd(
    details.bankAccount,
    amountCzk,
    details.summary.variableSymbol,
    application.eventName,
  )

  return (
    <Card className="gap-4 p-6">
      <h2 className="text-lg font-semibold">{t("payment.totalOwed")}</h2>
      <dl className="flex flex-col gap-3">
        <QrDetail label={t("payment.amount")}>
          <MoneyAmount amountCzk={amountCzk} />
          <CopyButton
            value={String(amountCzk)}
            label={t("payment.copyAmount")}
          />
        </QrDetail>
        <QrDetail label={t("payment.account")}>
          <span className="min-w-0 break-all">{details.bankAccount}</span>
          <CopyButton
            value={details.bankAccount}
            label={t("common:clipboard.copyAccount")}
          />
        </QrDetail>
        <QrDetail label={t("payment.summaryVariableSymbol")}>
          <span>{details.summary.variableSymbol}</span>
          <CopyButton
            value={details.summary.variableSymbol}
            label={t("common:clipboard.copyVariableSymbol")}
          />
        </QrDetail>
        <div className="flex flex-col">
          <dt className="text-sm text-muted-foreground">{t("payment.summaryBreakdown")}</dt>
          <dd className="grid gap-x-4 gap-y-2 pt-1 sm:grid-cols-2">
            {owedTerms.map((payment) => (
              <div
                key={payment.termId}
                className="flex items-baseline justify-between gap-x-4 sm:flex-col sm:items-start"
              >
                <span className="text-sm text-muted-foreground">
                  {payment.term
                    ? formatDateRange(payment.term.startsOn, payment.term.endsOn, {
                        shouldShowYear: true,
                      })
                    : null}
                </span>
                <span className="shrink-0 text-base whitespace-nowrap">
                  <MoneyAmount amountCzk={payment.owedCzk} />
                </span>
              </div>
            ))}
          </dd>
        </div>
      </dl>
      <PaymentQrDownload
        spayd={spayd}
        variableSymbol={details.summary.variableSymbol}
      />
      <p className="text-sm text-muted-foreground">{t("payment.summaryQrExplanation")}</p>
      {details.terms.some((term) => term.owedCzk < 0) ? (
        <p className="text-sm">{t("payment.overpaymentNotTransferred")}</p>
      ) : null}
    </Card>
  )
}

function QrDetail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center justify-between gap-2 text-base">{children}</dd>
    </div>
  )
}
