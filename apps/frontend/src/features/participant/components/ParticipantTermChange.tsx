import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { DetailItem } from "@/components/molecules/DetailItem"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
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
import { notify } from "@/lib/notify"
import { termLine } from "@/lib/term-label"

import {
  changeParticipantTerms,
  participantChangeOptionsQueryOptions,
  type MyApplication,
} from "@/features/participant/api/applications"
import {
  participantChangeRequestsQueryOptions,
  submitChangeRequest,
} from "@/features/participant/api/changeRequests"

export type ChangeMode = "change" | "cancel"

// Figma (Design system): Detail přihlášky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15649-211 (mobile: 15649-293)
export function ParticipantTermActions({
  application,
  onStart,
}: {
  application: MyApplication
  onStart: (mode: ChangeMode) => void
}) {
  const { t } = useTranslation("participant")
  const requests = useQuery(participantChangeRequestsQueryOptions(application.id))
  if (!application.terms.some((term) => term.status !== "CANCELLED")) return null
  const isPendingRequest = requests.data?.some((request) => request.status === "PENDING") ?? false
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Button
        variant="outline"
        size="lg"
        disabled={requests.isPending || requests.isError || isPendingRequest}
        onClick={() => onStart("change")}
      >
        {t("change.open")}
      </Button>
      <Button
        variant="outline"
        size="lg"
        className="text-destructive hover:text-destructive"
        disabled={requests.isPending || requests.isError || isPendingRequest}
        onClick={() => onStart("cancel")}
      >
        {t("change.cancelOpen")}
      </Button>
    </div>
  )
}

/**
 * US-84 / #408: the participant changes a term or cancels from a dialog over the application
 * detail. The result is a toast; there is no result page.
 */
// Figma (Design system): #408 Dialog · změna termínu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=22640-37880 (mobile: 22640-38042)
// Figma (Design system): #408 Dialog · odhlášení termínu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=22640-38153 (mobile: 22640-38316)
// Figma (Design system): #408 Dialog · žádost o odhlášení · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=22640-38428 (mobile: 22640-38601)
export function ParticipantTermChange({
  application,
  mode,
  onClose,
}: {
  application: MyApplication
  mode: ChangeMode
  onClose: () => void
}) {
  const { t } = useTranslation("participant")
  const client = useQueryClient()
  const options = useQuery(participantChangeOptionsQueryOptions(application.id))
  const [sourceId, setSourceId] = useState<string>()
  const [targetId, setTargetId] = useState<string>()
  const [cancelId, setCancelId] = useState("all")

  const active = options.data?.terms.filter((term) => term.selected) ?? []
  const available = options.data?.terms.filter((term) => !term.selected) ?? []
  const source = active.find((term) => term.id === sourceId) ?? active[0]
  const target = available.find((term) => term.id === targetId) ?? available[0]
  const removed =
    mode === "cancel"
      ? cancelId === "all"
        ? active
        : active.filter((term) => term.id === cancelId)
      : source
        ? [source]
        : []
  const kept = active.filter((term) => !removed.includes(term))
  const selectedIds =
    mode === "cancel"
      ? kept.map((term) => term.id)
      : [
          ...active.filter((term) => term.id !== source?.id).map((term) => term.id),
          ...(target ? [target.id] : []),
        ]
  const canSubmit = removed.length > 0 && (mode === "cancel" || Boolean(target))
  const isImmediate = options.data?.canChangeImmediately ?? true
  const overpaidCzk = removed.reduce((sum, term) => sum + term.overpaymentAfterCancellationCzk, 0)

  const mutation = useMutation({
    mutationFn: async () => {
      if (isImmediate) {
        await changeParticipantTerms(application.id, selectedIds)
        return false
      }
      await submitChangeRequest(application.id, selectedIds)
      return true
    },
    onSuccess: async (isRequest) => {
      onClose()
      notify.success(
        t(
          isRequest
            ? mode === "cancel"
              ? "change.toast.requestedCancel"
              : "change.toast.requestedChange"
            : mode === "cancel"
              ? "change.toast.cancelled"
              : "change.toast.changed",
        ),
      )
      await client.invalidateQueries({ queryKey: ["participant", "applications"] })
      await client.invalidateQueries({ queryKey: ["participant", "change-request-notifications"] })
    },
  })

  /** What happens to the payment of a term that leaves the application. */
  const removedValue = (term: NonNullable<typeof source>) => {
    const status = application.terms.find((item) => item.termId === term.id)?.status
    const hasPaymentImpact =
      term.paidCzk !== 0 ||
      term.owedBeforeCancellationCzk !== 0 ||
      term.owedAfterCancellationCzk !== 0
    if (hasPaymentImpact) {
      return t(mode === "change" ? "change.paidChange" : "change.paidCancel", {
        paid: formatCzk(term.paidCzk),
        overpaid: formatCzk(term.overpaymentAfterCancellationCzk),
        debt: formatCzk(term.owedAfterCancellationCzk),
      })
    }
    if (mode === "change") return t("change.noPayment")
    if (status === "TO_EVALUATE") return t("change.toEvaluateNoBed")
    return t(status === "WAITLISTED" ? "change.waitlistedNoPayment" : "change.noPayment")
  }

  const impactNote =
    mode === "change"
      ? t("change.noTransfer")
      : !isImmediate
        ? t("change.refundByOrganizer")
        : overpaidCzk > 0
          ? t("change.overpaidCancel", { overpaid: formatCzk(overpaidCzk) })
          : null

  const title = t(
    mode === "change"
      ? "change.title"
      : isImmediate
        ? "change.cancelTitle"
        : "change.cancelRequestTitle",
  )
  const subject = `${application.firstName} ${application.lastName} · ${application.eventName}`

  const body = () => {
    if (options.isPending) return <LoadingState />
    if (options.isError) {
      return (
        <ErrorState
          title={t("change.loadError")}
          error={options.error}
          onRetry={() => void options.refetch()}
        />
      )
    }
    return (
      <>
        {!isImmediate ? (
          <Alert>
            <TriangleAlert aria-hidden />
            <AlertTitle className="line-clamp-none">{t("change.approvalTitle")}</AlertTitle>
            <AlertDescription>{t("change.approvalDescription")}</AlertDescription>
          </Alert>
        ) : null}
        {mode === "change" ? (
          <>
            {active.length > 1 ? (
              <div className="flex flex-col gap-2">
                <Label>{t("change.sourceTerm")}</Label>
                <Select
                  value={source?.id}
                  onValueChange={setSourceId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {active.map((term) => (
                      <SelectItem
                        key={term.id}
                        value={term.id}
                      >
                        {termLine(term)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : source ? (
              <DetailItem label={t("change.sourceTerm")}>{termLine(source)}</DetailItem>
            ) : null}
            <div className="flex flex-col gap-2">
              <Label>{t("change.targetTerm")}</Label>
              <Select
                value={target?.id}
                onValueChange={setTargetId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("change.noAvailableTerms")} />
                </SelectTrigger>
                <SelectContent position="popper">
                  {available.map((term) => (
                    <SelectItem
                      key={term.id}
                      value={term.id}
                    >
                      {termLine(term)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <Label>{t("change.cancelScope")}</Label>
            <Select
              value={cancelId}
              onValueChange={setCancelId}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">
                  {t("change.allTerms", { count: active.length })}
                </SelectItem>
                {active.map((term) => (
                  <SelectItem
                    key={term.id}
                    value={term.id}
                  >
                    {t("change.onlyTerm", { term: termLine(term) })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">{t("change.cancelScopeHint")}</p>
          </div>
        )}
        {canSubmit ? (
          <section className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold tracking-tight">
              {t(
                mode === "change"
                  ? "change.impact"
                  : isImmediate
                    ? "change.cancelImpact"
                    : "change.cancelImpactAfterApproval",
              )}
            </h3>
            {removed.map((term) => (
              <DetailItem
                key={term.id}
                className="border-t pt-4"
                label={
                  mode === "change"
                    ? t(isImmediate ? "change.impactOriginal" : "change.impactOriginalRequest")
                    : termLine(term)
                }
              >
                {removedValue(term)}
              </DetailItem>
            ))}
            {mode === "change" && target ? (
              <DetailItem
                className="border-t pt-4"
                label={t("change.impactNew")}
              >
                {t("change.newPrice", {
                  price: formatCzk(target.priceCzk),
                  owed: formatCzk(target.owedAfterChangeCzk),
                })}
              </DetailItem>
            ) : null}
            {impactNote ? <p className="border-t pt-4">{impactNote}</p> : null}
          </section>
        ) : null}
        {!isImmediate ? (
          <p>{t("change.bedAfterApproval")}</p>
        ) : mode === "change" ? (
          <p>{t("change.bedChange")}</p>
        ) : (
          <p>{t(kept.length > 0 ? "change.bedCancelKept" : "change.bedCancel")}</p>
        )}
        {mutation.error ? (
          <Alert variant="destructive">
            <AlertDescription>{mutation.error.message}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter className="flex-row gap-2">
          <Button
            variant="ghost"
            size="lg"
            className="flex-1"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            {t("change.discard")}
          </Button>
          <Button
            size="lg"
            className="flex-2"
            variant={mode === "cancel" && isImmediate ? "destructive" : "default"}
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {t(
              mutation.isPending
                ? "change.saving"
                : !isImmediate
                  ? "change.requestSubmit"
                  : mode === "cancel"
                    ? "change.confirmCancel"
                    : "change.confirmChange",
            )}
          </Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-160">
        <div className="flex [scrollbar-width:thin] flex-col gap-4 overflow-y-auto p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl">{title}</DialogTitle>
            <DialogDescription className="sr-only">{subject}</DialogDescription>
          </DialogHeader>
          <p>{subject}</p>
          {body()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
