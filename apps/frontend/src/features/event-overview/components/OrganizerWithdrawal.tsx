import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { MoneyAmount } from "@/components/atoms/MoneyAmount"
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
import { notify } from "@/lib/notify"
import { termDates, termTitle } from "@/lib/term-label"

import { paymentQueryOptions } from "@/features/event-overview/api/payments"
import { type TermStatusDetail } from "@/features/event-overview/api/termStatus"
import {
  withdrawalPreviewQueryOptions,
  withdrawTerms,
} from "@/features/event-overview/api/termWithdrawal"
import { ImpactFigure } from "@/features/event-overview/components/ImpactFigure"

const ALL = "all"

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
}: {
  applicationId: string
  /** Terms the application is in now (not cancelled). */
  terms: TermStatusDetail[]
  /** The term the dialog opens on; null withdraws from the whole application. */
  initialTermId: string | null
  onClose: () => void
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
    onSuccess: async () => {
      onClose()
      notify.success(t("withdrawal.done"))
      await client.invalidateQueries({ queryKey: ["eventOverview"] })
      await client.invalidateQueries({ queryKey: ["participant", "applications"] })
    },
  })

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
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-160">
        <div className="flex [scrollbar-width:thin] flex-col gap-6 overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">{title}</DialogTitle>
            <DialogDescription className="sr-only">{subject ?? title}</DialogDescription>
          </DialogHeader>
          {application.data ? (
            <div className="flex flex-col gap-1">
              <span className="text-lg font-semibold text-foreground">
                {application.data.firstName} {application.data.lastName}
              </span>
              <span className="text-sm text-muted-foreground">{application.data.eventName}</span>
            </div>
          ) : null}
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
            <section className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold tracking-tight">
                {t(isWhole ? "withdrawal.wholeImpactTitle" : "withdrawal.impactTitle")}
              </h3>
              {impactRows.map((row) => {
                const term = terms.find((candidate) => candidate.termId === row.termId)
                if (!term) return null
                return (
                  <div
                    key={row.termId}
                    className="flex flex-col gap-3 border-t pt-4"
                  >
                    <p className="font-medium">{termTitle(term)}</p>
                    <dl className="grid grid-cols-3 gap-3">
                      <ImpactFigure label={t("withdrawal.paid")}>
                        <MoneyAmount amountCzk={row.paidCzk} />
                      </ImpactFigure>
                      <ImpactFigure label={t("withdrawal.debt")}>
                        <MoneyAmount amountCzk={row.debtCzk} />
                      </ImpactFigure>
                      <ImpactFigure label={t("withdrawal.overpaymentLabel")}>
                        <MoneyAmount amountCzk={row.overpaymentCzk} />
                      </ImpactFigure>
                    </dl>
                  </div>
                )
              })}
              {hasOthers ? (
                <p className="border-t pt-4 text-sm text-muted-foreground">
                  {t("withdrawal.othersUnchanged")}
                </p>
              ) : null}
            </section>
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
          <DialogFooter>
            <Button
              variant="outline"
              size="lg"
              disabled={mutation.isPending}
              onClick={onClose}
            >
              {t("withdrawal.back")}
            </Button>
            <Button
              variant="destructive"
              size="lg"
              disabled={!preview.data || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {submitLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
