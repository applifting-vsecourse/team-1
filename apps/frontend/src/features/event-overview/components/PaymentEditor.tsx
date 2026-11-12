import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { DetailItem } from "@/components/molecules/DetailItem"
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
import { termDates, termLine, termTitle } from "@/lib/term-label"

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
  /** Opens the dialog on the refund of the overpayment (#399) instead of on a payment. */
  initialType?: RecordType
}

export type RecordType = "payment" | "refund"
const WHOLE_APPLICATION = "all"

/**
 * Record a payment or a refund (US-111): a Payment / Refund switch, the term, the amount, the
 * result after saving and Back / Record on the right. A refund is offered only for terms the
 * backend reports an overpayment for (`refundableTermId`, `refundableCzk`) and is limited by it.
 */
// Figma (Design system): #399 Dialog · vratka předvoleného termínu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=22642-92343 (360 px: node-id=22642-92611)
// Figma (Design system): O34q Zápis platby na souhrn · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16050-235 (360 px: M13q 16487-7776)
// Figma (Design system): O34r Zápis platby na termín · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16050-467
// Figma (Design system): O34t Zápis vratky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16050-676 (360 px: M13r 16487-7929)
// Figma (Design system): O34z Vratka zakázaná, žádný přeplatek · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16661-2818 (360 px: M13v 16661-3150)
// Figma (Design system): O34ab Neplatná částka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16851-3347 (360 px: M13x 16851-3840)
// Figma (Design system): O34v Chyba vratky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16487-5497
// Figma (Design system): O34w Odesílání vratky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16487-5799
// Figma (Design system): O34x Chyba serveru u vratky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16487-6244
// The refund follows the #399 frame (the O34t / M13r frames are older). The payment variants still follow the O34* set.
// Older frames below are not linked in issue #204 and were not re-checked in Figma:
// Figma (Design system): O34d Doplatit celou částku · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-19811
// Figma (Design system): O34e Jiná částka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-20038
// Figma (Design system): O34d1 Neplatná částka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-20339
// Figma (Design system): O34g Doplatit zbytek · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-20843
// Figma (Design system): O34h Dílčí platba · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12796-21146
// Figma (Design system): O34j Další platba po úhradě · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13968-8761
// Figma (Design system): O34l Varování před přeplatkem · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13980-10529
// Figma (Design system): O34n Vrácení přeplatku · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13982-8860
export function PaymentEditor({
  application,
  onClose,
  term: initialTerm,
  initialType = "payment",
}: Props) {
  const { t } = useTranslation("eventOverview")
  const client = useQueryClient()
  const [requestId] = useState(() => crypto.randomUUID())
  // Opened on a refund: the preselected term, else the one the backend names (#262), is chosen.
  const initialRefundTerm =
    initialType === "refund"
      ? (initialTerm ??
        application.terms.find((candidate) => candidate.termId === application.refundableTermId))
      : undefined
  const [type, setType] = useState<RecordType>(initialRefundTerm ? "refund" : "payment")
  const isRefund = type === "refund"
  const [termChoice, setTermChoice] = useState(
    initialRefundTerm?.termId ?? initialTerm?.termId ?? WHOLE_APPLICATION,
  )
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
  const [amount, setAmount] = useState(String(initialRefundTerm?.refundableCzk ?? ""))
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
  // The text under an invalid amount: over the limit of a refund, or not a positive whole number.
  const isOverLimit =
    isRefund && receipt !== undefined && Number.isInteger(receipt) && receipt > overpayment
  const invalidMessage = t(
    isOverLimit
      ? "payment.refundOverLimit"
      : isRefund
        ? "payment.invalidRefund"
        : "payment.invalidAmount",
    { amount: formatCzk(overpayment) },
  )
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto p-6 sm:max-w-160">
        <DialogHeader>
          <DialogTitle className="text-lg tracking-tight">
            {t(isRefund ? "payment.refundTitle" : "payment.dialogTitle")}
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
            <Label htmlFor="payment-term">
              {t(isRefund ? "payment.termRequired" : "payment.termLabel")}
            </Label>
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
                      ? `${termTitle(candidate)} · ${formatCzk(candidate.refundableCzk)}`
                      : termLine(candidate)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isRefund ? (
            term ? (
              <p className="-mt-2 text-sm text-muted-foreground">
                {termDates(term)} ·{" "}
                {t("payment.refundTermLimit", { amount: formatCzk(overpayment) })}
              </p>
            ) : null
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
                {t(isRefund ? "payment.amountRequired" : "payment.requiredAmount")}
              </Label>
              <div className="relative">
                <Input
                  id="payment-amount"
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  disabled={mutation.isPending}
                  placeholder={t("payment.placeholder")}
                  className={isRefund ? "pr-14" : undefined}
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
                {isRefund ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-medium text-muted-foreground"
                  >
                    {t("payment.currency")}
                  </span>
                ) : null}
              </div>
              <p
                id="payment-amount-hint"
                className={
                  isRefund ? "text-sm text-muted-foreground" : "text-xs text-muted-foreground"
                }
              >
                {isRefund
                  ? t("payment.refundHint")
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
                  {invalidMessage}
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
          <div aria-live="polite">
            {isValid && isRefund && receipt !== undefined ? (
              <DetailItem label={t("payment.afterCorrection")}>
                {t("payment.refundResult", {
                  paid: formatCzk(scope.paid),
                  newPaid: formatCzk(scope.paid - receipt),
                  overpayment: preview,
                })}
              </DetailItem>
            ) : isValid ? (
              <div className="flex items-baseline justify-between gap-4 border-t pt-3">
                <span className="text-sm text-muted-foreground">
                  {t(hasOverpayment ? "payment.overpaidPreview" : "payment.preview")}
                </span>
                <span className="text-lg font-semibold tabular-nums">{preview}</span>
              </div>
            ) : null}
          </div>
          {mutation.error && isRefund ? (
            <Alert
              variant="destructive"
              role="alert"
            >
              <AlertTitle className="line-clamp-none">{t("payment.refundFailed")}</AlertTitle>
              <AlertDescription>{mutation.error.message}</AlertDescription>
            </Alert>
          ) : mutation.error ? (
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
              className="sm:flex-1"
              disabled={mutation.isPending}
              onClick={onClose}
            >
              {t("payment.dialogCancel")}
            </Button>
            <Button
              type="submit"
              size="lg"
              className="sm:flex-1"
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? t("payment.saving")
                : isRefund
                  ? t("payment.refund")
                  : isValid && receipt !== undefined
                    ? t("payment.recordAmount", { amount: formatCzk(receipt) })
                    : t("payment.record")}
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
