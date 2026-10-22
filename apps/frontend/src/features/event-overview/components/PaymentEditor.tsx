import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCzk } from "@/lib/money"

import {
  cancelPayment,
  savePayment,
  type Payment,
  type PaymentApplication,
} from "@/features/event-overview/api/payments"

type Props = { application: PaymentApplication; payment?: Payment; onClose: () => void }

// Figma: O34d/e/f · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-19811
export function PaymentEditor({ application, payment, onClose }: Props) {
  const { t } = useTranslation(["eventOverview", "errors"])
  const client = useQueryClient()
  const [isPaid, setIsPaid] = useState(true)
  const [amount, setAmount] = useState(payment ? String(payment.amountCzk) : "")
  const [isInvalid, setIsInvalid] = useState(false)
  const parsed = amount.trim() === "" ? undefined : Number(amount)
  const isValid =
    parsed === undefined ||
    (/^\d+$/.test(amount) && Number.isInteger(parsed) && parsed <= 2147483647)
  const remainingPaid = application.amountPaidCzk - (payment?.amountCzk ?? 0)
  const preview =
    application.amountDueCzk -
    remainingPaid -
    (isPaid ? (isValid ? (parsed ?? application.amountDueCzk) : 0) : 0)
  const mutation = useMutation({
    mutationFn: async () => {
      if (isPaid) await savePayment(application.id, parsed, payment)
      else if (payment) await cancelPayment(application.id, payment)
    },
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
        className="max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto rounded-xl p-8 sm:max-w-140"
      >
        <DialogTitle className="text-2xl leading-8">
          {t(payment ? "payment.editTitle" : "payment.record")}
        </DialogTitle>
        <DialogDescription className="text-foreground">
          {application.firstName} {application.lastName} · {application.code} ·{" "}
          {application.eventName}
        </DialogDescription>
        <form
          className="flex flex-col gap-6"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            if (isPaid && !isValid) {
              setIsInvalid(true)
              return
            }
            mutation.mutate()
          }}
        >
          <p>
            {t("payment.due")}: {formatCzk(application.amountDueCzk)}
            <br />
            {t("payment.paidSoFar")}: {formatCzk(application.amountPaidCzk)}
          </p>
          <div className="flex min-h-11 items-center gap-2">
            <Checkbox
              id="payment-paid"
              checked={isPaid}
              disabled={mutation.isPending}
              onCheckedChange={(value) => setIsPaid(value === true)}
            />
            <Label htmlFor="payment-paid">{t("payment.paidCheckbox")}</Label>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="payment-amount">{t("payment.amount")}</Label>
            <Input
              id="payment-amount"
              type="text"
              inputMode="numeric"
              value={amount}
              disabled={!isPaid || mutation.isPending}
              placeholder={t("payment.placeholder")}
              aria-invalid={isInvalid && isPaid && !isValid}
              aria-describedby="payment-amount-hint"
              onChange={(event) => {
                setAmount(event.target.value)
                setIsInvalid(false)
              }}
            />
            <p
              id="payment-amount-hint"
              className="text-xs text-muted-foreground"
            >
              {!isPaid
                ? t("payment.cancelHint")
                : parsed === undefined
                  ? t("payment.fullHint", { amount: formatCzk(application.amountDueCzk) })
                  : t("payment.partialHint", {
                      due: formatCzk(application.amountDueCzk),
                      paid: formatCzk(isValid ? parsed : 0),
                      owed: formatCzk(preview),
                    })}
            </p>
            {isInvalid && isPaid && !isValid ? (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {t("errors:VALIDATION_FAILED")}
              </p>
            ) : null}
          </div>
          <p
            className="text-lg font-semibold"
            aria-live="polite"
          >
            {t("payment.preview", { amount: formatCzk(preview) })}
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
              type="button"
              variant="outline"
              size="lg"
              disabled={mutation.isPending}
              onClick={onClose}
            >
              {t("payment.cancel")}
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={mutation.isPending}
            >
              {t(
                mutation.isPending
                  ? "payment.saving"
                  : payment
                    ? "payment.saveChange"
                    : "payment.save",
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
