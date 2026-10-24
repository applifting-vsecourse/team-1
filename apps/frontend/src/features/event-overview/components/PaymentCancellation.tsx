import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatCzk } from "@/lib/money"

import {
  cancelPayment,
  type Payment,
  type PaymentApplication,
} from "@/features/event-overview/api/payments"
import { SummaryBox } from "@/features/event-overview/components/PaymentEditor"

/** Cancel one payment or refund record: what it changes, the balance after, Back / Cancel record. */
// Figma (Design system): O34f Zrušit zápis platby · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-20185
// Figma (Design system): O34i Zrušit dílčí platbu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-20995
// Figma (Design system): O34m Zrušit platbu při přeplatku · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13980-10919
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto p-6 sm:max-w-130">
        <DialogHeader>
          <DialogTitle className="text-lg tracking-tight">
            {t(payment.amountCzk < 0 ? "payment.cancelRefundTitle" : "payment.cancelTitle")}
          </DialogTitle>
          <DialogDescription>
            {application.firstName} {application.lastName} · {application.code} ·{" "}
            {application.eventName}
          </DialogDescription>
        </DialogHeader>
        <SummaryBox
          rows={[
            [t("payment.editorDue"), formatCzk(application.amountDueCzk)],
            [t("payment.paidNow"), formatCzk(application.amountPaidCzk)],
            [t("payment.cancelledRecord"), formatCzk(Math.abs(payment.amountCzk))],
          ]}
        />
        <p>
          {t(
            payment.amountCzk < 0 ? "payment.cancelRefundDescription" : "payment.cancelDescription",
            { amount: formatCzk(Math.abs(payment.amountCzk)) },
          )}
        </p>
        <p className="border-t pt-3 font-semibold">
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
          <Button
            variant="outline"
            size="lg"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            {t(payment.amountCzk < 0 ? "payment.keepRefund" : "payment.keep")}
          </Button>
          <Button
            variant="destructive"
            size="lg"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {t(mutation.isPending ? "payment.cancelling" : "payment.cancelRecord")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
