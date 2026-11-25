import { useMutation, useQueryClient } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { BackButton } from "@/components/atoms/BackLink"
import { PendingButton } from "@/components/atoms/PendingButton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDate } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { termTitle } from "@/lib/term-label"

import {
  cancelPayment,
  type Payment,
  type PaymentApplication,
} from "@/features/event-overview/api/payments"

/** Confirmation to cancel a payment or refund record with all its receipt rows. */
// Figma v2: US-44 Zrušit zápis platby · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22479-86873
export function PaymentCancellation({
  application,
  payment,
  onClose,
}: {
  application: PaymentApplication
  payment: Payment
  onClose: () => void
}) {
  const { t } = useTranslation("eventOverview")
  const client = useQueryClient()
  const balanceAfter = application.amountOwedCzk + payment.amountCzk
  const mutation = useMutation({
    mutationFn: () => cancelPayment(application.id, payment),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["eventOverview"] }),
        client.invalidateQueries({ queryKey: ["participant", "applications"] }),
      ])
      onClose()
    },
  })
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto p-6 sm:max-w-160">
        <DialogHeader>
          <DialogTitle className="text-xl tracking-tight">
            {t(payment.amountCzk < 0 ? "payment.cancelRefundTitle" : "payment.cancelTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {application.firstName} {application.lastName} · {application.code} ·{" "}
            {application.eventName}
          </DialogDescription>
        </DialogHeader>
        <Alert variant="destructive">
          <TriangleAlert aria-hidden />
          <AlertTitle className="line-clamp-none">{t("payment.cancelWholeReceipt")}</AlertTitle>
          <AlertDescription>{t("payment.cancelAllAllocations")}</AlertDescription>
        </Alert>
        <section className="flex flex-col gap-2 rounded-lg border p-3">
          <h3 className="text-xl font-bold tracking-tight">
            {t("payment.cancelReceiptDate", { date: formatDate(payment.createdAt) })}
          </h3>
          <p>{t("payment.receiptTotal", { amount: formatCzk(payment.amountCzk) })}</p>
          <ul className="flex flex-col gap-2">
            {payment.rows.map((row) => {
              const term = application.terms.find((item) => item.termId === row.termId)
              return (
                <li key={row.termId}>
                  {term ? termTitle(term) + " · " : ""}
                  {formatCzk(row.amountCzk)}
                </li>
              )
            })}
          </ul>
          <p>{t("payment.cancelKeepsHistory")}</p>
        </section>
        <p className="font-semibold">
          {t(balanceAfter < 0 ? "payment.cancelOverpaidPreview" : "payment.cancelPreview", {
            amount: formatCzk(Math.abs(balanceAfter)),
          })}
        </p>
        {mutation.error ? (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {mutation.error.message}
          </p>
        ) : null}
        <DialogFooter>
          <BackButton
            disabled={mutation.isPending}
            onClick={onClose}
          >
            {t(payment.amountCzk < 0 ? "payment.keepRefund" : "payment.keep")}
          </BackButton>
          <PendingButton
            isPending={mutation.isPending}
            variant="destructive"
            size="lg"
            className="sm:min-w-36"
            onClick={() => mutation.mutate()}
          >
            {t(mutation.isPending ? "payment.cancelling" : "payment.cancelRecord")}
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
