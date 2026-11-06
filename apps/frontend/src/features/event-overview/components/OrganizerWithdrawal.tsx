import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCzk } from "@/lib/money"
import { termDates, termTitle } from "@/lib/term-label"

import { paymentQueryOptions } from "@/features/event-overview/api/payments"
import { type TermStatusDetail } from "@/features/event-overview/api/termStatus"
import {
  withdrawalPreviewQueryOptions,
  withdrawTerms,
  type WithdrawalPreview,
} from "@/features/event-overview/api/termWithdrawal"

/** What the result card shows about one term the participant was withdrawn from. */
export type WithdrawnTerm = {
  termId: string
  title: string
  fromStatus: TermStatusDetail["status"]
  debtCzk: number
  overpaymentCzk: number
  hasFinancialImpact: boolean
}
export type WithdrawalOutcome = {
  terms: WithdrawnTerm[]
  changedAt: string
  changedByName: string | null
}

const ALL = "all"

function Impact({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">{children}</div>
}

/**
 * US-32: an organizer withdraws a participant from one term or from the whole application. The
 * financial impact per term is shown before confirming (read from the server, nothing is
 * written); no reason is asked, the change is logged by the system with the organizer.
 * Beds are not shown: assigning them comes with US-35.
 */
// Figma (Design system): #32 Odhlásit účastníka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-35031 (mobile: 19786-35192)
// Figma (Design system): #32 Odhlásit celou přihlášku · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-35279 (mobile: 19786-35421)
export function OrganizerWithdrawal({
  applicationId,
  terms,
  initialTermId,
  onClose,
  onDone,
}: {
  applicationId: string
  /** Terms the application is in now (not cancelled). */
  terms: TermStatusDetail[]
  /** The term the dialog opens on; null withdraws from the whole application. */
  initialTermId: string | null
  onClose: () => void
  onDone: (outcome: WithdrawalOutcome) => void
}) {
  const { t } = useTranslation("eventOverview")
  const client = useQueryClient()
  const application = useQuery(paymentQueryOptions(applicationId))
  const isWhole = initialTermId === null
  const [scope, setScope] = useState(initialTermId ?? ALL)
  const termIds = isWhole ? terms.map((term) => term.termId) : [scope]
  const preview = useQuery(withdrawalPreviewQueryOptions(applicationId, termIds))
  const mutation = useMutation({
    mutationFn: () => withdrawTerms(applicationId, termIds),
    onSuccess: async (result) => {
      const impact = preview.data?.terms ?? []
      onDone({
        changedAt: result.changedAt,
        changedByName: result.changedByName,
        terms: terms
          .filter((term) => termIds.includes(term.termId))
          .map((term) => {
            const row = impact.find((candidate) => candidate.termId === term.termId)
            return {
              termId: term.termId,
              title: termTitle(term),
              fromStatus: term.status,
              debtCzk: row?.debtCzk ?? 0,
              overpaymentCzk: row?.overpaymentCzk ?? 0,
              hasFinancialImpact: row?.hasFinancialImpact ?? false,
            }
          }),
      })
      await client.invalidateQueries({ queryKey: ["eventOverview"] })
      await client.invalidateQueries({ queryKey: ["participant", "applications"] })
    },
  })

  const termMoney = (impact: WithdrawalPreview["terms"][number]) => {
    const paid = formatCzk(impact.paidCzk)
    const debt = formatCzk(impact.debtCzk)
    return {
      line: t("withdrawal.paidAndDebt", { paid, debt }),
      overpayment:
        impact.overpaymentCzk > 0
          ? t("withdrawal.overpayment", { amount: formatCzk(impact.overpaymentCzk) })
          : null,
    }
  }
  const subject = application.data
    ? `${application.data.firstName} ${application.data.lastName} · ${application.data.eventName}`
    : null
  const title = t(isWhole ? "withdrawal.wholeTitle" : "withdrawal.title")
  const submitLabel = !isWhole
    ? t("withdrawal.submit")
    : terms.length === 2
      ? t("withdrawal.submitWholeTwo")
      : t("withdrawal.submitWholeAll")
  const hasOthers = !isWhole && terms.length > 1
  const impactRows = preview.data?.terms.filter((row) => row.isWithdrawn) ?? []

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-6 overflow-y-auto p-6 sm:max-w-160">
        <DialogHeader>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          <DialogDescription className="sr-only">{subject ?? title}</DialogDescription>
        </DialogHeader>
        {!isWhole && subject ? <p>{subject}</p> : null}
        {!isWhole ? (
          <div className="flex flex-col gap-2">
            <Label>{t("withdrawal.scope")}</Label>
            <Select
              value={scope}
              onValueChange={setScope}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {terms.map((term) => (
                  <SelectItem
                    key={term.termId}
                    value={term.termId}
                  >
                    {t("withdrawal.oneTerm", { term: termDates(term) })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {preview.error ? (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {t("withdrawal.errorTitle")}
          </p>
        ) : null}
        {preview.data ? (
          <Impact>
            <h3 className="text-2xl font-bold tracking-tight">
              {t(isWhole ? "withdrawal.wholeImpactTitle" : "withdrawal.impactTitle")}
            </h3>
            {impactRows.map((row) => {
              const term = terms.find((candidate) => candidate.termId === row.termId)
              const money = termMoney(row)
              if (!term) return null
              return isWhole ? (
                <p key={row.termId}>
                  {termTitle(term)}
                  {money ? ` · ${money.line}` : ""}
                  {money?.overpayment ? ` · ${money.overpayment}` : ""}
                </p>
              ) : (
                <div
                  key={row.termId}
                  className="flex flex-col gap-4"
                >
                  <p>{termTitle(term)}</p>
                  {money ? <p>{money.line}</p> : null}
                  {money?.overpayment ? <p>{money.overpayment}</p> : null}
                </div>
              )
            })}
            {hasOthers ? <p>{t("withdrawal.othersUnchanged")}</p> : null}
          </Impact>
        ) : null}
        {!isWhole ? (
          <Alert>
            <TriangleAlert aria-hidden />
            <AlertTitle className="line-clamp-none">{t("withdrawal.noRefundTitle")}</AlertTitle>
            <AlertDescription>{t("withdrawal.noRefundDescription")}</AlertDescription>
          </Alert>
        ) : null}
        {mutation.error ? (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {mutation.error.message}
          </p>
        ) : null}
        <DialogFooter className="flex-col sm:flex-col">
          <Button
            variant="destructive"
            size="lg"
            className="w-full"
            disabled={!preview.data || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {submitLabel}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            {t("withdrawal.back")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
