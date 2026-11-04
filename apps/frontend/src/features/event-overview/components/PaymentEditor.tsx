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
  recordPayment,
  recordRefund,
  type PaymentApplication,
  type PaymentTerm,
} from "@/features/event-overview/api/payments"

type Props = {
  application: PaymentApplication
  onClose: () => void
  /** Term preselected in the dialog (US-110); without it the summary of the application. */
  term?: PaymentTerm
}

type RecordType = "payment" | "refund"
const WHOLE_APPLICATION = "all"

/**
 * Record a payment or a refund (US-111): a Payment / Refund switch, the term, the amount, the
 * result after saving and Back / Record on the right. A refund is offered only for terms the
 * backend reports an overpayment for (`refundableTermId`, `refundableCzk`) and is limited by it.
 */
// Figma (Design system): US-111 Zápis platby · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15857-6961
// Figma (Design system): US-111 Zápis vratky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15857-7108
// Figma (Design system): O34z Vratka zakázaná, žádný přeplatek · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16661-2818
// Figma (Design system): O34d Doplatit celou částku · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-19811
// Figma (Design system): O34e Jiná částka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-20038
// Figma (Design system): O34d1 Neplatná částka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-20339
// Figma (Design system): O34g Doplatit zbytek · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-20843
// Figma (Design system): O34h Dílčí platba · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-21146
// Figma (Design system): O34j Další platba po úhradě · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13968-8761
// Figma (Design system): O34l Varování před přeplatkem · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13980-10529
// Figma (Design system): O34n Vrácení přeplatku · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13982-8860
export function PaymentEditor({ application, onClose, term: initialTerm }: Props) {
  const { t } = useTranslation("eventOverview")
  const client = useQueryClient()
  const [requestId] = useState(() => crypto.randomUUID())
  const [type, setType] = useState<RecordType>("payment")
  const isRefund = type === "refund"
  const [termChoice, setTermChoice] = useState(initialTerm?.termId ?? WHOLE_APPLICATION)
  // The chosen term; without one the dialog works with the whole application.
  const term = application.terms.find((candidate) => candidate.termId === termChoice)
  const refundTerms = application.terms.filter((candidate) => candidate.refundableCzk > 0)
  // The limit of a refund is the overpayment of the chosen term, computed by the backend.
  const overpayment = isRefund ? (term?.refundableCzk ?? 0) : 0
  // What the dialog settles: one term, or — for a summary payment — the whole application.
  const scope = term
    ? {
        due: term.dueCzk,
        paid: term.paidCzk,
        owed: term.owedCzk,
        payable: Math.max(0, term.owedCzk),
      }
    : {
        due: application.amountDueCzk,
        paid: application.amountPaidCzk,
        owed: application.amountOwedCzk,
        payable: application.payableCzk,
      }
  const [amount, setAmount] = useState("")
  const [amountMode, setAmountMode] = useState(scope.payable > 0 ? "remaining" : "custom")
  const [isInvalid, setIsInvalid] = useState(false)
  const unspaced = amount.replace(/\s/g, "")
  const normalized = /^\d{1,3}(,\d{3})+$/.test(unspaced) ? unspaced.replace(/,/g, "") : unspaced
  const parsed = normalized === "" ? undefined : Number(normalized)
  // What a summary payment settles: an overpayment of another term does not reduce it.
  const remaining = Math.max(0, scope.payable)
  const isCustomAmount = isRefund || amountMode === "custom" || remaining === 0
  const receipt = isCustomAmount ? parsed : remaining
  const isValid =
    (!isCustomAmount || /^\d+$/.test(normalized)) &&
    receipt !== undefined &&
    Number.isInteger(receipt) &&
    receipt > 0 &&
    receipt <= 2147483647 &&
    (!isRefund || receipt <= overpayment)
  const projectedBalance = isValid && receipt !== undefined ? scope.owed - receipt : undefined
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
        ? recordRefund(application.id, requestId, receipt!, term!.termId)
        : term
          ? recordPayment(application.id, requestId, receipt, term.termId)
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
          <DialogTitle className="text-lg tracking-tight">{t("payment.dialogTitle")}</DialogTitle>
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
          <RadioGroup
            value={type}
            disabled={mutation.isPending}
            aria-label={t("payment.typeChoice")}
            className="grid grid-cols-2 gap-4"
            onValueChange={(value) => {
              const next = value as RecordType
              setType(next)
              setIsInvalid(false)
              if (next === "refund") {
                const first = application.terms.find(
                  (candidate) => candidate.termId === application.refundableTermId,
                )
                setTermChoice(first?.termId ?? WHOLE_APPLICATION)
                setAmount(String(first?.refundableCzk ?? ""))
              } else {
                setTermChoice(initialTerm?.termId ?? WHOLE_APPLICATION)
                setAmount("")
                setAmountMode(scope.payable > 0 ? "remaining" : "custom")
              }
            }}
          >
            <div className="flex min-h-11 items-center gap-2 p-2">
              <RadioGroupItem
                value="payment"
                id="payment-type-payment"
                className="size-5"
              />
              <Label htmlFor="payment-type-payment">{t("payment.typePayment")}</Label>
            </div>
            <div className="flex min-h-11 items-center gap-2 p-2">
              <RadioGroupItem
                value="refund"
                id="payment-type-refund"
                className="size-5"
                disabled={application.refundableTermId === null}
              />
              <Label
                htmlFor="payment-type-refund"
                className={application.refundableTermId === null ? "opacity-55" : undefined}
              >
                {t("payment.typeRefund")}
              </Label>
            </div>
          </RadioGroup>
          <div className="flex flex-col gap-2">
            <Label htmlFor="payment-term">{t("payment.termLabel")}</Label>
            <Select
              value={termChoice}
              disabled={mutation.isPending}
              onValueChange={(value) => {
                setTermChoice(value)
                setIsInvalid(false)
                const chosen = application.terms.find((candidate) => candidate.termId === value)
                if (isRefund) {
                  setAmount(String(chosen?.refundableCzk ?? ""))
                } else {
                  setAmountMode(
                    (chosen ? Math.max(0, chosen.owedCzk) : application.payableCzk) > 0
                      ? "remaining"
                      : "custom",
                  )
                }
              }}
            >
              <SelectTrigger
                id="payment-term"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {isRefund ? null : (
                  <SelectItem value={WHOLE_APPLICATION}>{t("payment.wholeApplication")}</SelectItem>
                )}
                {(isRefund ? refundTerms : application.terms).map((candidate) => (
                  <SelectItem
                    key={candidate.termId}
                    value={candidate.termId}
                  >
                    {isRefund
                      ? t("payment.refundTermOption", {
                          term: termDates(candidate),
                          amount: formatCzk(candidate.refundableCzk),
                        })
                      : termDates(candidate)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isRefund ? (
            <>
              <SummaryBox rows={[[t("payment.refundSummaryLabel"), formatCzk(overpayment)]]} />
              <p>{t("payment.refundHint")}</p>
            </>
          ) : (
            <SummaryBox
              rows={[
                [t("payment.editorDue"), formatCzk(scope.due)],
                [t("payment.paidSoFar"), formatCzk(scope.paid)],
                [
                  t(scope.owed < 0 ? "payment.overpaid" : "payment.remainingToPay"),
                  formatCzk(Math.abs(scope.owed)),
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
