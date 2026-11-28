import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PendingButton } from "@/components/atoms/PendingButton"
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
import { cn } from "@/lib/utils"

import {
  changeParticipantTerms,
  participantChangeOptionsQueryOptions,
  type MyApplication,
} from "@/features/participant/api/applications"
import {
  participantChangeRequestsQueryOptions,
  submitChangeRequest,
} from "@/features/participant/api/changeRequests"
import type { ChangeMode } from "@/features/participant/components/change-impact"
import { impactWarning, termImpact } from "@/features/participant/components/change-impact"

export type { ChangeMode }

// Figma (Design system v2): Detail přihlášky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15649-211 (mobile: 15649-293)
export function ParticipantTermActions({
  application,
  onStart,
  className,
}: {
  application: MyApplication
  onStart: (mode: ChangeMode) => void
  /** `contents` lets the buttons join a button row of the parent. */
  className?: string
}) {
  const { t } = useTranslation("participant")
  const requests = useQuery(participantChangeRequestsQueryOptions(application.id))
  if (
    !application.terms.some((term) => term.status !== "CANCELLED" && term.status !== "ARCHIVED")
  ) {
    return null
  }
  const isPendingRequest = requests.data?.some((request) => request.status === "PENDING") ?? false
  return (
    // Actions in the head of the terms section (Figma 27649:35098).
    <div className={cn("flex flex-wrap gap-1", className)}>
      <Button
        variant="ghost"
        disabled={requests.isPending || requests.isError || isPendingRequest}
        onClick={() => onStart("change")}
      >
        {t("change.open")}
      </Button>
      <Button
        variant="destructive"
        size="lg"
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
// Figma (Design system v2): #408 Dialog · změna termínu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-37880 (mobile: 22640-38042)
// Figma (Design system v2): #408 Dialog · odhlášení termínu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-38153 (mobile: 22640-38316)
// Figma (Design system v2): #408 Dialog · žádost o odhlášení · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-38428 (mobile: 22640-38601)
// Figma (Design system v2): #551 Dialog · změnit termín · zaplaceno · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27256-31092 (mobile: 27256-31244)
// Figma (Design system v2): #551 Dialog · odhlásit · zaplaceno · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27256-31590 (mobile: 27256-31736)
// Figma (Design system v2): #551 Dialog · žádost o odhlášení · zaplaceno · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27256-32301 (mobile: 27256-32440)
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

  const archivedIds = application.terms
    .filter((term) => term.status === "ARCHIVED")
    .map((term) => term.termId)
  const active =
    options.data?.terms.filter((term) => term.selected && !archivedIds.includes(term.id)) ?? []
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
  const hasRemovedBed = removed.some((term) =>
    application.terms.some((item) => item.termId === term.id && item.status === "CONFIRMED"),
  )
  const kept = active.filter((term) => !removed.includes(term))
  const selectedIds = [
    ...archivedIds,
    ...(mode === "cancel"
      ? kept.map((term) => term.id)
      : [
          ...active.filter((term) => term.id !== source?.id).map((term) => term.id),
          ...(target ? [target.id] : []),
        ]),
  ]
  const canSubmit = removed.length > 0 && (mode === "cancel" || Boolean(target))
  const isImmediate = options.data?.canChangeImmediately ?? true
  const hasPaid = removed.some((term) => term.paidCzk > 0)
  const warning = canSubmit ? impactWarning({ mode, isImmediate, hasRemovedBed, hasPaid }) : null

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

  /** What happens to the payment of a term that leaves the application, in one sentence. */
  const removedValue = (term: NonNullable<typeof source>) => {
    const status = application.terms.find((item) => item.termId === term.id)?.status ?? "CONFIRMED"
    const impact = termImpact(mode, { ...term, status })
    return impact.params
      ? t(impact.key, {
          paid: formatCzk(impact.params.paid),
          total: formatCzk(impact.params.total),
        })
      : t(impact.key)
  }

  const warningBlock = warning ? (
    <Alert>
      <TriangleAlert aria-hidden />
      <AlertTitle className="line-clamp-none">{t(warning.title)}</AlertTitle>
      {warning.lines.length > 0 ? (
        <AlertDescription>
          <ul className="flex flex-col gap-1">
            {warning.lines.map((line) => (
              <li key={line}>{t(line)}</li>
            ))}
          </ul>
        </AlertDescription>
      ) : null}
    </Alert>
  ) : null

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
        {!isImmediate ? warningBlock : null}
        {mode === "change" ? (
          <>
            {active.length > 1 ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="source-term">{t("change.sourceTerm")}</Label>
                <Select
                  value={source?.id}
                  onValueChange={setSourceId}
                >
                  <SelectTrigger
                    id="source-term"
                    className="w-full"
                  >
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
              <Label htmlFor="target-term">{t("change.targetTerm")}</Label>
              <Select
                value={target?.id}
                onValueChange={setTargetId}
                disabled={available.length === 0}
              >
                <SelectTrigger
                  id="target-term"
                  className="w-full"
                >
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
            <Label htmlFor="cancel-scope">{t("change.cancelScope")}</Label>
            <Select
              value={cancelId}
              onValueChange={setCancelId}
            >
              <SelectTrigger
                id="cancel-scope"
                className="w-full"
              >
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
          <section className="flex flex-col gap-3 border-t border-border pt-4">
            <h3 className="text-lg font-bold tracking-tight">
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
                label={mode === "change" ? t("change.sourceTerm") : termLine(term)}
              >
                {removedValue(term)}
              </DetailItem>
            ))}
            {mode === "change" && target ? (
              <DetailItem label={t("change.targetTerm")}>
                {target.owedAfterChangeCzk > 0
                  ? t("change.state.newTerm", { owed: formatCzk(target.owedAfterChangeCzk) })
                  : t("change.state.newTermFree")}
              </DetailItem>
            ) : null}
          </section>
        ) : null}
        {isImmediate ? warningBlock : null}
        {mutation.error ? (
          <Alert variant="destructive">
            <AlertDescription>{mutation.error.message}</AlertDescription>
          </Alert>
        ) : null}
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
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-160"
      >
        <div className="flex [scrollbar-width:thin] flex-col gap-4 overflow-y-auto p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl">{title}</DialogTitle>
            <DialogDescription className="sr-only">{subject}</DialogDescription>
          </DialogHeader>
          <p>{subject}</p>
          {body()}
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
            {!options.isPending && !options.isError ? (
              <PendingButton
                isPending={mutation.isPending}
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
              </PendingButton>
            ) : null}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
