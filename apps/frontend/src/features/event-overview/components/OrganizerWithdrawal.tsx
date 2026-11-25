import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { BackButton } from "@/components/atoms/BackLink"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { PendingButton } from "@/components/atoms/PendingButton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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

import type { PaymentApplication } from "@/features/event-overview/api/payments"
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
  application,
  terms,
  initialTermId,
  onClose,
}: {
  applicationId: string
  application: Pick<PaymentApplication, "firstName" | "lastName" | "eventName"> | undefined
  /** Active terms only (neither cancelled nor archived). */
  terms: TermStatusDetail[]
  /** The term the dialog opens on; null withdraws from the whole application. */
  initialTermId: string | null
  onClose: () => void
}) {
  const { t } = useTranslation("eventOverview")
  const client = useQueryClient()
  const isWhole = initialTermId === null
  const [scope, setScope] = useState(initialTermId ?? ALL)
  const termIds = isWhole ? terms.map((term) => term.termId) : [scope]
  const preview = useQuery(withdrawalPreviewQueryOptions(applicationId, termIds))
  const mutation = useMutation({
    mutationFn: () =>
      withdrawTerms(
        applicationId,
        termIds,
        (preview.data?.terms ?? [])
          .filter((row) => row.isWithdrawn)
          .map((row) => ({
            termId: row.termId,
            applicationId: row.substitute?.applicationId ?? null,
          })),
      ),
    // The waitlist may have changed since the preview (409): show the current substitute again.
    onError: () => client.invalidateQueries({ queryKey: ["eventOverview", "withdrawalPreview"] }),
    onSuccess: async () => {
      onClose()
      notify.success(t("withdrawal.done"))
      await client.invalidateQueries({ queryKey: ["eventOverview"] })
      await client.invalidateQueries({ queryKey: ["participant", "applications"] })
    },
  })

  const subject = application
    ? `${application.firstName} ${application.lastName} · ${application.eventName}`
    : null
  const title = t(isWhole ? "withdrawal.wholeTitle" : "withdrawal.title")
  const impactRows = preview.data?.terms.filter((row) => row.isWithdrawn) ?? []
  const isWaitlistWithdrawal =
    !isWhole && impactRows.length === 1 && impactRows[0]?.status === "WAITLISTED"
  const hasNoWaitlistImpact =
    isWaitlistWithdrawal &&
    impactRows.every(
      (row) =>
        !row.hasFinancialImpact &&
        row.paidCzk === 0 &&
        row.debtCzk === 0 &&
        row.overpaymentCzk === 0,
    )
  const submitLabel = !isWhole
    ? t(isWaitlistWithdrawal ? "withdrawal.submitWaitlist" : "withdrawal.submit")
    : terms.length === 2
      ? t("withdrawal.submitWholeTwo")
      : t("withdrawal.submitWholeAll")
  const substituteRows = impactRows.flatMap((row) => {
    const term = terms.find((candidate) => candidate.termId === row.termId)
    return row.substitute && term ? [{ row, term }] : []
  })

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-160">
        <div className="flex [scrollbar-width:thin] flex-col gap-6 overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">{title}</DialogTitle>
            <DialogDescription className="sr-only">{subject ?? title}</DialogDescription>
          </DialogHeader>
          {application ? (
            <div className="flex flex-col gap-1">
              <span className="text-lg font-semibold text-foreground">
                {application.firstName} {application.lastName}
              </span>
              <span className="text-sm text-muted-foreground">{application.eventName}</span>
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
                    {row.status === "WAITLISTED" && <p>{t("termStatus.state.WAITLISTED")}</p>}
                    <dl className="flex flex-col gap-2 sm:grid sm:grid-cols-3 sm:gap-3">
                      <ImpactFigure
                        label={t("withdrawal.paid")}
                        className="flex-row items-baseline justify-between gap-3 sm:flex-col sm:items-stretch sm:justify-start sm:gap-1"
                      >
                        <MoneyAmount amountCzk={row.paidCzk} />
                      </ImpactFigure>
                      <ImpactFigure
                        label={t("withdrawal.debt")}
                        className="flex-row items-baseline justify-between gap-3 sm:flex-col sm:items-stretch sm:justify-start sm:gap-1"
                      >
                        <MoneyAmount amountCzk={row.debtCzk} />
                      </ImpactFigure>
                      <ImpactFigure
                        label={t("withdrawal.overpaymentLabel")}
                        className="flex-row items-baseline justify-between gap-3 sm:flex-col sm:items-stretch sm:justify-start sm:gap-1"
                      >
                        <MoneyAmount amountCzk={row.overpaymentCzk} />
                      </ImpactFigure>
                    </dl>
                  </div>
                )
              })}
            </section>
          ) : null}
          {/* US-546: the freed bed is filled by the system, so say who gets it before confirming.
              Figma: no frame yet (issue #546 is `design: needed`), built from the kit's Alert. */}
          {substituteRows.map(({ row, term }) => (
            <Alert key={row.termId}>
              <TriangleAlert aria-hidden />
              <AlertTitle className="line-clamp-none">{t("withdrawal.substituteTitle")}</AlertTitle>
              <AlertDescription>
                {t("withdrawal.substituteDescription", {
                  term: termDates(term),
                  name: `${row.substitute?.firstName} ${row.substitute?.lastName}`,
                })}
              </AlertDescription>
            </Alert>
          ))}
          <Alert>
            <TriangleAlert aria-hidden />
            <AlertTitle className="line-clamp-none">
              {t(hasNoWaitlistImpact ? "withdrawal.waitlistImpact" : "withdrawal.noRefundTitle")}
            </AlertTitle>
            <AlertDescription>
              {t(
                hasNoWaitlistImpact
                  ? "withdrawal.waitlistNotice"
                  : "withdrawal.noRefundDescription",
              )}
            </AlertDescription>
          </Alert>
          {mutation.error ? (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {mutation.error.message}
            </p>
          ) : null}
          <DialogFooter>
            <BackButton
              disabled={mutation.isPending}
              onClick={onClose}
            >
              {t("withdrawal.back")}
            </BackButton>
            <PendingButton
              isPending={mutation.isPending}
              variant="destructive"
              size="lg"
              disabled={!preview.data || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {submitLabel}
            </PendingButton>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
