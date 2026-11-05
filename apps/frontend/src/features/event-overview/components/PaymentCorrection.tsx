import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCzk } from "@/lib/money"
import { termDates } from "@/lib/term-label"

import {
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
  const newSignedAmount = isRefund ? -parsed : parsed
  const owedAfter = application.amountOwedCzk + payment.amountCzk - newSignedAmount
  const termOwedAfter = originalTerm
    ? originalTerm.owedCzk + payment.amountCzk - newSignedAmount
    : null
  const isSameTerm = originalTerm?.termId === termChoice
  const previewOwed = isSameTerm && termOwedAfter !== null ? termOwedAfter : owedAfter
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

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className="top-0 left-0 h-dvh max-h-dvh w-screen max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none border-0 p-4 sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-160 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl sm:text-xl">{t("payment.correctTitle")}</DialogTitle>
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
            mutation.mutate()
          }}
        >
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">{t("payment.typeChoice")}</dt>
              <dd>{t(isRefund ? "payment.typeRefund" : "payment.typePayment")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("payment.originalValue")}</dt>
              <dd>
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
                  className="pr-12"
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
          {isValid ? (
            <div
              className="border-t pt-3 text-sm"
              aria-live="polite"
            >
              <span className="text-muted-foreground">{t("payment.afterCorrection")}</span>
              <p>
                {t(
                  isSameTerm && termOwedAfter !== null
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
                  },
                )}
              </p>
            </div>
          ) : null}
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
              className="h-12 w-full sm:flex-1"
              onClick={onClose}
            >
              {t("payment.cancel")}
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={mutation.isPending}
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
