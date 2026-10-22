import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { formatCzk } from "@/lib/money"

import {
  cancelPayment,
  type Payment,
  type PaymentApplication,
} from "@/features/event-overview/api/payments"

// Figma: O34i · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-20995
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
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto rounded-lg p-8 sm:max-w-140"
      >
        <DialogTitle className="text-2xl leading-8">{t("payment.cancelTitle")}</DialogTitle>
        <DialogDescription className="text-foreground">
          {application.firstName} {application.lastName} · {application.code} ·{" "}
          {application.eventName}
        </DialogDescription>
        <p>{t("payment.cancelDescription", { amount: formatCzk(payment.amountCzk) })}</p>
        <p className="text-lg font-semibold">
          {t("payment.cancelPreview", {
            amount: formatCzk(application.amountOwedCzk + payment.amountCzk),
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
        <div className="grid grid-cols-2 gap-6">
          <Button
            variant="outline"
            size="lg"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            {t("payment.keep")}
          </Button>
          <Button
            variant="destructive"
            size="lg"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {t(mutation.isPending ? "payment.cancelling" : "payment.cancelRecord")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
