import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { formatCzk } from "@/lib/money"

import { recordPayment, type PaymentApplication } from "@/features/event-overview/api/payments"

type Props = { application: PaymentApplication; onClose: () => void }

// Figma: O34g/h/j · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-20843
export function PaymentEditor({ application, onClose }: Props) {
  const { t } = useTranslation("eventOverview")
  const client = useQueryClient()
  const [requestId] = useState(() => crypto.randomUUID())
  const [amount, setAmount] = useState("")
  const [amountMode, setAmountMode] = useState(
    application.amountOwedCzk > 0 ? "remaining" : "custom",
  )
  const [isInvalid, setIsInvalid] = useState(false)
  const unspaced = amount.replace(/\s/g, "")
  const normalized = /^\d{1,3}(,\d{3})+$/.test(unspaced) ? unspaced.replace(/,/g, "") : unspaced
  const parsed = normalized === "" ? undefined : Number(normalized)
  const remaining = Math.max(0, application.amountOwedCzk)
  const isCustomAmount = amountMode === "custom" || remaining === 0
  const receipt = isCustomAmount ? parsed : remaining
  const isValid =
    (!isCustomAmount || /^\d+$/.test(normalized)) &&
    receipt !== undefined &&
    Number.isInteger(receipt) &&
    receipt > 0 &&
    receipt <= 2147483647
  const preview =
    isValid && receipt !== undefined ? formatCzk(application.amountOwedCzk - receipt) : "—"
  const mutation = useMutation({
    mutationFn: () => recordPayment(application.id, requestId, receipt),
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
        <DialogTitle className="text-2xl leading-8">{t("payment.record")}</DialogTitle>
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
          <p>
            {t("payment.editorDue")}: {formatCzk(application.amountDueCzk)}
            <br />
            {t("payment.paidSoFar")}: {formatCzk(application.amountPaidCzk)}
            <br />
            {t("payment.remainingToPay")}: {formatCzk(remaining)}
          </p>
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
          {isCustomAmount ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="payment-amount">{t("payment.requiredAmount")}</Label>
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
                {remaining === 0
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
                  {t("payment.invalidAmount")}
                </p>
              ) : null}
            </div>
          ) : null}
          <p
            className="text-lg font-semibold"
            aria-live="polite"
          >
            {t("payment.preview", { amount: preview })}
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
                  ? t("payment.recordAmount", { amount: formatCzk(receipt) })
                  : t("payment.record")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
