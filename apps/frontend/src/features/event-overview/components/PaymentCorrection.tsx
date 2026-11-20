import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { PendingButton } from "@/components/atoms/PendingButton"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiErrorCode } from "@/lib/api-client"
import { formatDateRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { termDates, termLine, termTitle } from "@/lib/term-label"
import { cn } from "@/lib/utils"

import {
  correctionPreviewQueryOptions,
  correctPayment,
  type Payment,
  type PaymentApplication,
} from "@/features/event-overview/api/payments"
import {
  hasUncertainOutcome,
  RefreshAfterWrite,
} from "@/features/event-overview/components/RefreshAfterWrite"

const WHOLE_APPLICATION = "all"

// Figma v2: US-112 Upravit platbu · předvyplněný zápis · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=21569-73036 (360 px: node-id=21569-73472)
// Figma v2: US-112 Upravit vratku · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=21569-78237 (360 px: node-id=21569-78678)
// Figma v2: US-112 Oprava vratky převyšuje limit · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=21569-79733 · Probíhá ukládání opravy · node-id=21569-80544
export function PaymentCorrection({
  application,
  payment,
  onClose,
  onSaved,
}: {
  application: PaymentApplication
  payment: Payment
  onClose: () => void
  onSaved: (amountCzk: number, termId?: string) => void
}) {
  const { t } = useTranslation("eventOverview")
  const client = useQueryClient()
  const [requestId] = useState(() => crypto.randomUUID())
  const isRefund = payment.amountCzk < 0
  const [termChoice, setTermChoice] = useState(
    payment.isSummary === true || payment.rows.length !== 1
      ? WHOLE_APPLICATION
      : (payment.rows[0]?.termId ?? WHOLE_APPLICATION),
  )
  const [amount, setAmount] = useState(String(Math.abs(payment.amountCzk)))
  const [isInvalid, setIsInvalid] = useState(false)
  const normalized = amount.replace(/\s/g, "")
  const parsed = /^\d+(?:,00)?$/.test(normalized) ? Number(normalized.replace(/,00$/, "")) : NaN
  const isValid = Number.isInteger(parsed) && parsed > 0 && parsed <= 2147483647
  const originalTerm =
    payment.isSummary !== true && payment.rows.length === 1
      ? application.terms.find((term) => term.termId === payment.rows[0]?.termId)
      : null
  const isSameTerm = originalTerm?.termId === termChoice
  const targetTerm = application.terms.find((term) => term.termId === termChoice)
  const shouldShowMove = originalTerm && targetTerm && !isSameTerm
  const mutation = useMutation({
    mutationFn: () =>
      correctPayment(
        application.id,
        payment,
        requestId,
        parsed,
        termChoice === WHOLE_APPLICATION ? undefined : termChoice,
      ),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["eventOverview"] }),
        client.invalidateQueries({ queryKey: ["participant", "applications"] }),
      ])
      onSaved(parsed, termChoice === WHOLE_APPLICATION ? undefined : termChoice)
      onClose()
    },
  })
  const isUncertain = hasUncertainOutcome(mutation.error)
  const preview = useQuery({
    ...correctionPreviewQueryOptions(
      application.id,
      payment.id,
      parsed,
      termChoice === WHOLE_APPLICATION ? undefined : termChoice,
    ),
    enabled: isValid && !mutation.isPending && !isUncertain,
  })
  const originalPreview = preview.data?.terms.find((term) => term.termId === originalTerm?.termId)
  const targetPreview = preview.data?.terms.find((term) => term.termId === targetTerm?.termId)
  const termOwedAfter = originalPreview?.owedCzk ?? null
  const previewOwed =
    isSameTerm && originalPreview ? originalPreview.owedCzk : (preview.data?.amountOwedCzk ?? 0)
  const balanceChange = originalPreview?.changeCzk ?? 0
  const formError = mutation.error ?? preview.error

  const isStale = apiErrorCode(formError) === "PAYMENT_RECEIPT_ALREADY_CANCELLED"
  // The refund limit is a fault of the amount: it is shown under the field (Figma 21569-79733).
  const isOverLimit = apiErrorCode(formError) === "REFUND_EXCEEDS_OVERPAYMENT"
  const initialTermChoice =
    payment.isSummary === true || payment.rows.length !== 1
      ? WHOLE_APPLICATION
      : (payment.rows[0]?.termId ?? WHOLE_APPLICATION)
  const isUnchanged = parsed === Math.abs(payment.amountCzk) && termChoice === initialTermChoice

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent
        className={cn(
          "flex max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto bg-card p-4 sm:max-w-160 sm:p-6",
          isRefund &&
            !isUncertain &&
            !isStale &&
            apiErrorCode(formError) !== "REFUND_EXCEEDS_OVERPAYMENT" &&
            "sm:max-w-130",
        )}
      >
        <DialogHeader className="pr-10 text-left">
          <DialogTitle className="text-xl tracking-tight">
            {t(isRefund ? "payment.correctRefundTitle" : "payment.correctTitle")}
          </DialogTitle>
          <DialogDescription>
            {application.firstName} {application.lastName} ·{" "}
            {t("payment.applicationCode", { code: application.code })}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            if (isUncertain || isStale || mutation.isPending) return
            if (!isValid) {
              setIsInvalid(true)
              return
            }
            if (!preview.data || preview.isFetching || preview.isError) return
            mutation.mutate()
          }}
        >
          <dl>
            <dt className="text-sm text-muted-foreground">{t("payment.originalValue")}</dt>
            <dd className="mt-2">
              {t(isRefund ? "payment.typeRefund" : "payment.typePayment")}{" "}
              {formatCzk(payment.amountCzk)}
              {originalTerm ? ` · ${termTitle(originalTerm)}` : ""}
            </dd>
          </dl>
          {!isStale && (
            <div className="flex flex-col gap-4">
              <div className="flex min-w-0 flex-col gap-2">
                <Label htmlFor="correct-payment-term">{t("payment.termRequired")}</Label>
                <Select
                  value={termChoice}
                  disabled={mutation.isPending}
                  onValueChange={setTermChoice}
                >
                  <SelectTrigger
                    id="correct-payment-term"
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {!isRefund ? (
                      <SelectItem value={WHOLE_APPLICATION}>
                        {t("payment.wholeApplication")}
                      </SelectItem>
                    ) : null}
                    {application.terms
                      .filter(
                        (term) =>
                          !isRefund ||
                          term.termId === payment.rows[0]?.termId ||
                          term.refundableCzk > 0,
                      )
                      .map((term) => (
                        <SelectItem
                          key={term.termId}
                          value={term.termId}
                        >
                          {termLine(term)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <Label htmlFor="correct-payment-amount">{t("payment.correctionAmount")}</Label>
                <div className="relative">
                  <Input
                    id="correct-payment-amount"
                    inputMode="decimal"
                    className="pr-12"
                    value={amount}
                    disabled={mutation.isPending}
                    aria-invalid={(isInvalid && !isValid) || isOverLimit}
                    aria-describedby={isOverLimit ? "correct-payment-limit" : undefined}
                    onChange={(event) => {
                      setAmount(event.target.value)
                      setIsInvalid(false)
                    }}
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground"
                  >
                    {t("payment.currency")}
                  </span>
                </div>
                {isInvalid && !isValid ? (
                  <p
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {t("payment.invalidAmount")}
                  </p>
                ) : isOverLimit && formError ? (
                  <p
                    id="correct-payment-limit"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {formError.message}
                  </p>
                ) : null}
              </div>
            </div>
          )}
          {!isStale && isUnchanged ? (
            <div aria-live="polite">
              <span className="text-sm text-muted-foreground">{t("payment.correctionAfter")}</span>
              <p className="mt-2">{t("payment.correctionUnchanged")}</p>
            </div>
          ) : !isStale && isValid && preview.data ? (
            <div
              className="text-base"
              aria-live="polite"
            >
              <span className="text-sm text-muted-foreground">{t("payment.correctionAfter")}</span>
              <p className="mt-2">
                {t(
                  shouldShowMove
                    ? "payment.correctionPreviewMove"
                    : isSameTerm &&
                        termOwedAfter !== null &&
                        termOwedAfter > 0 &&
                        balanceChange !== 0
                      ? isRefund
                        ? "payment.correctionPreviewDebtRefund"
                        : "payment.correctionPreviewDebtPayment"
                      : isSameTerm && termOwedAfter !== null
                        ? isRefund
                          ? "payment.correctionPreviewRefund"
                          : "payment.correctionPreviewTerm"
                        : "payment.correctionPreview",
                  {
                    old: formatCzk(Math.abs(payment.amountCzk)),
                    amount: formatCzk(parsed),
                    balanceLabel: t(
                      previewOwed < 0 ? "payment.overpaid" : "payment.remainingToPay",
                    ),
                    owed: formatCzk(Math.abs(previewOwed)),
                    change: formatCzk(Math.abs(balanceChange)),
                    direction: t(
                      balanceChange < 0
                        ? "payment.correctionDecreases"
                        : "payment.correctionIncreases",
                    ),
                    originalDirection: t(
                      (originalPreview?.changeCzk ?? 0) < 0
                        ? "payment.correctionDecreases"
                        : "payment.correctionIncreases",
                    ),
                    targetDirection: t(
                      (targetPreview?.changeCzk ?? 0) > 0
                        ? "payment.correctionIncreases"
                        : "payment.correctionDecreases",
                    ),
                    originalTerm: originalTerm
                      ? formatDateRange(originalTerm.startsOn, originalTerm.endsOn)
                      : "",
                    targetTerm: targetTerm
                      ? formatDateRange(targetTerm.startsOn, targetTerm.endsOn)
                      : "",
                  },
                )}
              </p>
              {termChoice === WHOLE_APPLICATION && (
                <ul className="mt-2 space-y-1">
                  {preview.data.terms.map((item) => {
                    const term = application.terms.find((entry) => entry.termId === item.termId)
                    if (
                      !term ||
                      item.allocatedCzk === undefined ||
                      (!item.allocatedCzk && !item.changeCzk)
                    ) {
                      return null
                    }
                    return (
                      <li key={term.termId}>
                        {t("payment.correctionAllocation", {
                          term: termDates(term),
                          amount: formatCzk(item.allocatedCzk),
                          balanceLabel: t(
                            item.owedCzk < 0 ? "payment.overpaid" : "payment.remainingToPay",
                          ),
                          balance: formatCzk(Math.abs(item.owedCzk)),
                        })}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ) : null}
          {!isStale && !isRefund ? (
            <p className="text-sm text-muted-foreground">{t("payment.correctionKeepsHistory")}</p>
          ) : null}
          {formError && !isOverLimit ? (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {isStale && <strong className="mb-1 block">{t("payment.staleCorrection")}</strong>}
              {isUncertain ? t("payment.uncertainCorrection") : formError.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={mutation.isPending}
              className="w-full sm:flex-1"
              onClick={onClose}
            >
              {t("payment.cancelCorrection")}
            </Button>
            {isUncertain || isStale ? (
              <RefreshAfterWrite
                label={t("payment.refreshHistory")}
                onRefreshed={onClose}
              />
            ) : (
              <PendingButton
                isPending={mutation.isPending}
                type="submit"
                size="lg"
                disabled={
                  isUnchanged ||
                  mutation.isPending ||
                  preview.isError ||
                  !preview.data ||
                  preview.isFetching
                }
                className="w-full sm:flex-1"
              >
                {t(mutation.isPending ? "payment.saving" : "payment.saveCorrection")}
              </PendingButton>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
