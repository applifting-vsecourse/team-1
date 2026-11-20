import type { ReactNode } from "react"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { CopyButton } from "@/components/atoms/CopyButton"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { PaymentQrDownload } from "@/components/molecules/PaymentQrDownload"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatDateRange } from "@/lib/date"
import { summaryPaymentSpayd } from "@/lib/payment-qr"

import type { MyApplication } from "@/features/participant/api/applications"

type Props = { application: MyApplication; onClose: () => void }

// Figma (Design system v2): US-127 / Detail přihlášky · Dialog: Platby · souhrnné QR · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22408-25109
// Figma (Design system v2): US-127 / Detail přihlášky · Dialog: Platby · souhrnné QR / Mobile · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22408-25357
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
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => !isOpen && onClose()}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto p-4 sm:max-w-md sm:p-6"
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
          <DialogTitle className="pr-10 text-left text-2xl">
            {t("payment.summaryQrTitle")}
          </DialogTitle>
        </DialogHeader>
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
        {spayd && (
          <PaymentQrDownload
            spayd={spayd}
            variableSymbol={details.summary.variableSymbol}
          />
        )}
        <p className="text-sm text-muted-foreground">{t("payment.summaryQrExplanation")}</p>
      </DialogContent>
    </Dialog>
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
