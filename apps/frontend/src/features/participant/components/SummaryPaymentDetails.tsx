import type { ReactNode } from "react"
import { Download } from "lucide-react"
import { useTranslation } from "react-i18next"

import { CopyButton } from "@/components/atoms/CopyButton"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateRange } from "@/lib/date"

import type { MyApplication } from "@/features/participant/api/applications"
import { usePaymentQr } from "@/features/participant/hooks/usePaymentQr"
import { summaryPaymentSpayd } from "@/features/participant/lib/payment-qr"

type Props = { application: MyApplication }

// Figma (Design system): US-127 / Detail přihlášky · Dialog: Platby · souhrnné QR · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16290-2854
// Figma (Design system): US-127 / Detail přihlášky · Dialog: Platby · souhrnné QR / Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16290-2921
// Figma (Design system): #311 Moje přihláška · Adam Dvořák · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19799-15345 (360 px: node-id=19799-15493)
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
  const qrImage = usePaymentQr(spayd)

  const saveQr = () => {
    if (!qrImage) return
    const link = document.createElement("a")
    link.href = qrImage
    link.download = `qr-${details.summary.variableSymbol}.png`
    link.click()
  }

  // #311 explicitly places the combined payment QR on the page; the linked Figma still draws a dialog.
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
          <dd className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
            {owedTerms.map((payment) => (
              <div
                key={payment.termId}
                className="flex flex-col"
              >
                <span className="text-sm text-muted-foreground">
                  {payment.term
                    ? formatDateRange(payment.term.startsOn, payment.term.endsOn, {
                        shouldShowYear: true,
                      })
                    : null}
                </span>
                <span className="text-base">
                  <MoneyAmount amountCzk={payment.owedCzk} />
                </span>
              </div>
            ))}
          </dd>
        </div>
      </dl>
      <div className="flex flex-col items-center gap-2">
        {qrImage ? (
          <img
            src={qrImage}
            width={200}
            height={200}
            className="size-40 sm:size-32"
            alt={t("payment.qrAlt")}
          />
        ) : null}
        <Button
          type="button"
          variant="outline"
          disabled={!qrImage}
          onClick={saveQr}
        >
          <Download aria-hidden="true" />
          {t("payment.saveQr")}
        </Button>
      </div>
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
