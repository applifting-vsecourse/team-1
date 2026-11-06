import type { ReactNode } from "react"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { CopyButton } from "@/components/atoms/CopyButton"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatDateRange } from "@/lib/date"

import type { MyApplication } from "@/features/participant/api/applications"
import { usePaymentQr } from "@/features/participant/hooks/usePaymentQr"
import { summaryPaymentSpayd } from "@/features/participant/lib/payment-qr"

type Props = { application: MyApplication; onClose: () => void }

// Figma (Design system): US-127 / Detail přihlášky · Dialog: Platby · souhrnné QR · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16290-2854
// Figma (Design system): US-127 / Detail přihlášky · Dialog: Platby · souhrnné QR / Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16290-2921
export function SummaryPaymentDialog({ application, onClose }: Props) {
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

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => !isOpen && onClose()}
    >
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 h-dvh max-h-dvh w-full max-w-full translate-x-0 translate-y-0 content-start gap-6 overflow-y-auto rounded-none border-0 p-4 sm:top-16 sm:left-1/2 sm:h-auto sm:max-h-[calc(100dvh-8rem)] sm:max-w-160 sm:-translate-x-1/2 sm:rounded-lg sm:border sm:p-6"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="absolute top-3 right-3 sm:top-4 sm:right-4"
          aria-label={t("payment.closeQr")}
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </Button>
        <DialogHeader>
          <DialogTitle className="text-left text-2xl">{t("payment.summaryQrTitle")}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_200px] sm:gap-x-6">
          <QrDetail label={t("payment.amount")}>
            <MoneyAmount amountCzk={amountCzk} />
            <CopyButton
              value={String(amountCzk)}
              label={t("payment.copyAmount")}
            />
          </QrDetail>
          <div className="flex flex-col items-start gap-2 sm:col-start-2 sm:row-span-4 sm:row-start-1 sm:w-50">
            {qrImage ? (
              <img
                src={qrImage}
                width={200}
                height={200}
                className="size-40 sm:size-50"
                alt={t("payment.qrAlt")}
              />
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="w-full"
              disabled={!qrImage}
              onClick={saveQr}
            >
              {t("payment.saveQr")}
            </Button>
          </div>
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
          <div className="sm:col-start-1">
            <p className="hidden pb-2 text-base sm:block">{t("payment.summaryBreakdown")}</p>
            {owedTerms.map((payment, index) => (
              <div key={payment.termId}>
                <p className="text-base sm:hidden">
                  {index === 0 ? `${t("payment.summaryBreakdownMobile")} ` : null}
                  {payment.term
                    ? formatDateRange(payment.term.startsOn, payment.term.endsOn)
                    : null}
                  {" · "}
                  <MoneyAmount amountCzk={payment.owedCzk} />
                </p>
                <div className="hidden pb-2 sm:block">
                  <p className="text-sm text-muted-foreground">
                    {payment.term
                      ? formatDateRange(payment.term.startsOn, payment.term.endsOn, {
                          shouldShowYear: true,
                        })
                      : null}
                  </p>
                  <p className="text-base">
                    {t("payment.summaryDebt")} <MoneyAmount amountCzk={payment.owedCzk} />
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-base sm:col-span-2">
            {t(
              details.terms.length === 2
                ? "payment.summaryQrExplanation"
                : "payment.summaryQrExplanationMany",
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function QrDetail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:col-start-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center justify-between gap-2 text-base">{children}</div>
    </div>
  )
}
