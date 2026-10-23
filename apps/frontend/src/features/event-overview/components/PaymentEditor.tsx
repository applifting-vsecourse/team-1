import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

/**
 * Record a payment (or, with `isRefund`, a refund of the overpayment): summary box, amount
 * choice, the result after saving and Back / Record on the right.
 */
// Figma (Design system): O34d Doplatit celou částku · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-19811
// Figma (Design system): O34e Jiná částka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-20038
// Figma (Design system): O34d1 Neplatná částka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-20339
// Figma (Design system): O34g Doplatit zbytek · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-20843
// Figma (Design system): O34h Dílčí platba · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-21146
// Figma (Design system): O34j Další platba po úhradě · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13968-8761
// Figma (Design system): O34l Varování před přeplatkem · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13980-10529
// Figma (Design system): O34n Vrácení přeplatku · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13982-8860
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto p-6 sm:max-w-130">
        <DialogHeader>
          <DialogTitle className="text-lg tracking-tight">
            {t(isRefund ? "payment.refund" : "payment.record")}
          </DialogTitle>
          <DialogDescription>
            {application.firstName} {application.lastName} · {application.code} ·{" "}
            {application.eventName}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
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
            <>
              <SummaryBox rows={[[t("payment.refundSummaryLabel"), formatCzk(overpayment)]]} />
              <p>{t("payment.refundHint")}</p>
            </>
          ) : (
            <SummaryBox
              rows={[
                [t("payment.editorDue"), formatCzk(application.amountDueCzk)],
                [t("payment.paidSoFar"), formatCzk(application.amountPaidCzk)],
                [
                  t(application.amountOwedCzk < 0 ? "payment.overpaid" : "payment.remainingToPay"),
                  formatCzk(Math.abs(application.amountOwedCzk)),
                ],
              ]}
            />
          )}
          {!isRefund ? (
            <RadioGroup
              value={isCustomAmount ? "custom" : "remaining"}
              disabled={mutation.isPending}
              aria-label={t("payment.amountChoice")}
              className="gap-1"
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
            className="border-t pt-3 font-semibold"
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
          <DialogFooter>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** The amounts the dialog works with, as label – value rows on the subtle surface. */
export function SummaryBox({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="flex flex-col gap-1.5 rounded-lg bg-muted px-4 py-3 text-sm">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex justify-between gap-4"
        >
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
