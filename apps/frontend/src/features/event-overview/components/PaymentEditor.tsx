import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { formatCzk } from "@/lib/money"

import {
  recordPayment,
  recordRefund,
  type PaymentApplication,
} from "@/features/event-overview/api/payments"

type Props = { application: PaymentApplication; onClose: () => void; isRefund?: boolean }

// Figma: O34g/h/j · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-20843
export function PaymentEditor({ application, onClose, isRefund = false }: Props) {
  const { t } = useTranslation("eventOverview")
  const client = useQueryClient()
  const [requestId] = useState(() => crypto.randomUUID())
  const overpayment = Math.max(0, -application.amountOwedCzk)
  const [amount, setAmount] = useState(isRefund ? String(overpayment) : "")
  const [amountMode, setAmountMode] = useState(
    application.amountOwedCzk > 0 ? "remaining" : "custom",
  )
  const [isInvalid, setIsInvalid] = useState(false)
  const unspaced = amount.replace(/\s/g, "")
  const normalized = /^\d{1,3}(,\d{3})+$/.test(unspaced) ? unspaced.replace(/,/g, "") : unspaced
  const parsed = normalized === "" ? undefined : Number(normalized)
  const remaining = Math.max(0, application.amountOwedCzk)
  const isCustomAmount = isRefund || amountMode === "custom" || remaining === 0
  const receipt = isCustomAmount ? parsed : remaining
  const isValid =
    (!isCustomAmount || /^\d+$/.test(normalized)) &&
    receipt !== undefined &&
    Number.isInteger(receipt) &&
    receipt > 0 &&
    receipt <= 2147483647 &&
    (!isRefund || receipt <= overpayment)
  const projectedBalance =
    isValid && receipt !== undefined ? application.amountOwedCzk - receipt : undefined
  const hasOverpayment = !isRefund && projectedBalance !== undefined && projectedBalance < 0
  const preview = isRefund
    ? isValid && receipt !== undefined
      ? formatCzk(overpayment - receipt)
      : "—"
    : projectedBalance !== undefined
      ? formatCzk(Math.abs(projectedBalance))
      : "—"
  const mutation = useMutation({
    mutationFn: () =>
      isRefund
        ? recordRefund(application.id, requestId, receipt!)
        : recordPayment(application.id, requestId, receipt),
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
        <DialogTitle className="text-2xl leading-8">
          {t(isRefund ? "payment.refund" : "payment.record")}
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
            if (!isValid) {
              setIsInvalid(true)
              return
            }
            mutation.mutate()
          }}
        >
          {isRefund ? (
            <p>
              {t("payment.refundSummary", { amount: formatCzk(overpayment) })}
              <br />
              {t("payment.refundHint")}
            </p>
          ) : (
            <p>
              {t("payment.editorDue")}: {formatCzk(application.amountDueCzk)}
              <br />
              {t("payment.paidSoFar")}: {formatCzk(application.amountPaidCzk)}
              <br />
              {t(
                application.amountOwedCzk < 0 ? "payment.overpaid" : "payment.remainingToPay",
              )}: {formatCzk(Math.abs(application.amountOwedCzk))}
            </p>
          )}
          {!isRefund ? (
            <RadioGroup
              value={isCustomAmount ? "custom" : "remaining"}
              disabled={mutation.isPending}
              aria-label={t("payment.amountChoice")}
              className="gap-2"
              onValueChange={(value) => {
                setAmountMode(value)
                setIsInvalid(false)
              }}
            >
              {remaining > 0 ? (
                <div className="flex min-h-11 items-center gap-2 p-2">
                  <RadioGroupItem
                    value="remaining"
                    id="payment-remaining"
                    className="size-5"
                  />
                  <Label htmlFor="payment-remaining">
                    {t("payment.payRemaining", { amount: formatCzk(remaining) })}
                  </Label>
                </div>
              ) : null}
              <div className="flex min-h-11 items-center gap-2 p-2">
                <RadioGroupItem
                  value="custom"
                  id="payment-custom"
                  className="size-5"
                />
                <Label htmlFor="payment-custom">{t("payment.customAmount")}</Label>
              </div>
            </RadioGroup>
          ) : null}
          {isCustomAmount ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="payment-amount">
                {t(isRefund ? "payment.refundAmount" : "payment.requiredAmount")}
              </Label>
              <Input
                id="payment-amount"
                type="text"
                inputMode="numeric"
                value={amount}
                disabled={mutation.isPending}
                placeholder={t("payment.placeholder")}
                aria-invalid={isInvalid && !isValid}
                aria-describedby={
                  isInvalid && !isValid
                    ? "payment-amount-hint payment-amount-error"
                    : "payment-amount-hint"
                }
                onChange={(event) => {
                  setAmount(event.target.value)
                  setIsInvalid(false)
                }}
              />
              <p
                id="payment-amount-hint"
                className="text-xs text-muted-foreground"
              >
                {isRefund
                  ? t("payment.refundLimit", { amount: formatCzk(overpayment) })
                  : hasOverpayment
                    ? t("payment.receivedHint")
                    : remaining === 0
                      ? t("payment.noDebtHint")
                      : isValid
                        ? t("payment.partialHint", { owed: preview })
                        : null}
              </p>
              {isInvalid && !isValid ? (
                <p
                  id="payment-amount-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {t(isRefund ? "payment.invalidRefund" : "payment.invalidAmount", {
                    amount: formatCzk(overpayment),
                  })}
                </p>
              ) : null}
            </div>
          ) : null}
          {hasOverpayment ? (
            <Alert className="border-status-warning bg-status-warning-bg">
              <AlertTitle className="line-clamp-none">{t("payment.overpaymentWarning")}</AlertTitle>
              <AlertDescription className="text-base">
                {t("payment.overpaymentWarningDescription", { amount: preview })}
              </AlertDescription>
            </Alert>
          ) : null}
          <p
            className="text-lg font-semibold"
            aria-live="polite"
          >
            {t(
              isRefund
                ? "payment.refundPreview"
                : hasOverpayment
                  ? "payment.overpaidPreview"
                  : "payment.preview",
              { amount: preview },
            )}
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
              {mutation.isPending
                ? t("payment.saving")
                : isValid && receipt !== undefined
                  ? t(isRefund ? "payment.recordRefundAmount" : "payment.recordAmount", {
                      amount: formatCzk(receipt),
                    })
                  : t(isRefund ? "payment.refund" : "payment.record")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
