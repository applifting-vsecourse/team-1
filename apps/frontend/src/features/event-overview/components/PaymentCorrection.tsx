import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDateRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { termDates } from "@/lib/term-label"

import {
  correctionPreviewQueryOptions,
  correctPayment,
  type Payment,
  type PaymentApplication,
} from "@/features/event-overview/api/payments"

const WHOLE_APPLICATION = "all"

// Figma (Design system): US-112 · Upravit platbu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15883-7397 (mobile: 15883-7481)
// Figma (Design system): US-112 · Upravit vratku · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15883-7679 (mobile: 15883-7763)
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
  const [amount, setAmount] = useState(`${Math.abs(payment.amountCzk)},00`)
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
  const preview = useQuery({
    ...correctionPreviewQueryOptions(
      application.id,
      payment.id,
      parsed,
      termChoice === WHOLE_APPLICATION ? undefined : termChoice,
    ),
    enabled: isValid && !mutation.isPending,
  })
  const originalPreview = preview.data?.terms.find((term) => term.termId === originalTerm?.termId)
  const targetPreview = preview.data?.terms.find((term) => term.termId === targetTerm?.termId)
  const termOwedAfter = originalPreview?.owedCzk ?? null
  const previewOwed =
    isSameTerm && originalPreview ? originalPreview.owedCzk : (preview.data?.amountOwedCzk ?? 0)
  const balanceChange = originalPreview?.changeCzk ?? 0
  const formError = mutation.error ?? preview.error

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className="top-0 left-0 flex h-dvh max-h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-y-auto rounded-none border-0 bg-card p-4 sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-160 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border sm:p-6">
        <DialogHeader className="pr-10 text-left">
          <DialogTitle className="max-w-64 text-2xl leading-8 sm:max-w-none sm:text-xl sm:leading-7">
            {t("payment.correctTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
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
            if (!preview.data || preview.isFetching) return
            mutation.mutate()
          }}
        >
          <dl className="flex flex-col gap-4 text-base">
            <div>
              <dt className="text-sm text-muted-foreground">{t("payment.typeChoice")}</dt>
              <dd className="mt-2">{t(isRefund ? "payment.typeRefund" : "payment.typePayment")}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t("payment.originalValue")}</dt>
              <dd className="mt-2">
                {formatCzk(Math.abs(payment.amountCzk))}
                {originalTerm ? ` · ${termDates(originalTerm)}` : ""}
              </dd>
            </div>
          </dl>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Label htmlFor="correct-payment-term">{t("payment.termRequired")}</Label>
              <Select
                value={termChoice}
                disabled={mutation.isPending}
                onValueChange={setTermChoice}
              >
                <SelectTrigger
                  id="correct-payment-term"
                  className="w-full text-base data-[size=default]:h-12"
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
                        {termDates(term)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Label htmlFor="correct-payment-amount">{t("payment.correctionAmount")}</Label>
              <div className="relative">
                <Input
                  id="correct-payment-amount"
                  inputMode="decimal"
                  className="h-12 pr-12 md:text-base"
                  value={amount}
                  disabled={mutation.isPending}
                  aria-invalid={isInvalid && !isValid}
                  onChange={(event) => {
                    setAmount(event.target.value)
                    setIsInvalid(false)
                  }}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground"
                >
                  CZK
                </span>
              </div>
              {isInvalid && !isValid ? (
                <p
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {t("payment.invalidAmount")}
                </p>
              ) : null}
            </div>
          </div>
          {isValid && preview.data ? (
            <div
              className="text-base"
              aria-live="polite"
            >
              <span className="text-sm text-muted-foreground">{t("payment.afterCorrection")}</span>
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
            </div>
          ) : null}
          {formError ? (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {formError.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={mutation.isPending}
              className="h-12 w-full sm:flex-1"
              onClick={onClose}
            >
              {t("payment.cancelCorrection")}
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={mutation.isPending || !preview.data || preview.isFetching}
              className="h-12 w-full sm:flex-1"
            >
              {t(mutation.isPending ? "payment.saving" : "payment.saveCorrection")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
