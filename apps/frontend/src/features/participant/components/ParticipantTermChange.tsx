import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDateTime } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { termLine, termTitle } from "@/lib/term-label"

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
    <div className="flex flex-wrap gap-3 border-t pt-4">
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
        disabled={requests.isPending || requests.isError || isPendingRequest}
        onClick={() => onStart("cancel")}
      >
        {t("change.cancelOpen")}
      </Button>
    </div>
  )
}

// Figma (Design system): #84 / Změnit termín · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-22160 (mobile: 19795-22304)
// Figma (Design system): #84 / Odhlásit se z termínu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-22398 (mobile: 19795-22522)
// Figma (Design system): #84 / Odeslat žádost o změnu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-22596 (mobile: 19795-22722)
export function ParticipantTermChange({
  application,
  mode,
  onBack,
}: {
  application: MyApplication
  mode: ChangeMode
  onBack: () => void
}) {
  const { t } = useTranslation("participant")
  const client = useQueryClient()
  const options = useQuery(participantChangeOptionsQueryOptions(application.id))
  const [sourceId, setSourceId] = useState<string>()
  const [targetId, setTargetId] = useState<string>()
  const [cancelId, setCancelId] = useState("all")
  const [result, setResult] = useState<{
    kind: "requested" | "changed" | "cancelled"
    mode: ChangeMode
    details: string[]
    targetLabel?: string
    at?: string
  }>()
  const [hasValidationError, setHasValidationError] = useState(false)

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
  const selectedIds =
    mode === "cancel"
      ? active.filter((term) => !removed.includes(term)).map((term) => term.id)
      : [
          ...active.filter((term) => term.id !== source?.id).map((term) => term.id),
          ...(target ? [target.id] : []),
        ]
  const canSubmit = removed.length > 0 && (mode === "cancel" || Boolean(target))
  const removedImpactLines = removed.map((term) => {
    const status = application.terms.find((item) => item.termId === term.id)?.status
    const hasPaymentImpact = term.paidCzk !== 0 || term.owedAfterCancellationCzk !== 0
    return hasPaymentImpact
      ? t(mode === "change" ? "change.removedPaidChange" : "change.removedPaid", {
          term: termTitle(term),
          paid: formatCzk(term.paidCzk),
          overpaid: formatCzk(term.overpaymentAfterCancellationCzk),
          debt: formatCzk(term.owedAfterCancellationCzk),
        })
      : t(
          mode === "change"
            ? "change.removedNoPaymentChange"
            : status === "WAITLISTED"
              ? "change.removedNoPayment"
              : "change.removedNoPaymentGeneric",
          { term: termTitle(term) },
        )
  })
  const newTermLine = (term: NonNullable<typeof target>, owedCzk: number) =>
    t("change.newPrice", {
      term: termTitle(term),
      price: formatCzk(term.priceCzk),
      owed: formatCzk(owedCzk),
    })
  const impactLines = [
    ...removedImpactLines,
    ...(mode === "change" && target ? [newTermLine(target, target.owedAfterChangeCzk)] : []),
  ]
  const mutation = useMutation({
    mutationFn: async (_snapshot: { details: string[]; target?: typeof target }) => {
      if (options.data?.canChangeImmediately) {
        return {
          request: null,
          change: await changeParticipantTerms(application.id, selectedIds),
        }
      }
      return { request: await submitChangeRequest(application.id, selectedIds), change: null }
    },
    onSuccess: async ({ request, change }, snapshot) => {
      await client.invalidateQueries({ queryKey: ["participant", "applications"] })
      await client.invalidateQueries({ queryKey: ["participant", "change-request-notifications"] })
      const addedTarget = change?.addedTerms.find((term) => term.termId === snapshot.target?.id)
      setResult({
        kind: request ? "requested" : mode === "cancel" ? "cancelled" : "changed",
        mode,
        details: [
          ...snapshot.details,
          ...(snapshot.target && addedTarget
            ? [newTermLine(snapshot.target, addedTarget.owedCzk)]
            : []),
        ],
        targetLabel: snapshot.target && termLine(snapshot.target),
        at: request?.createdAt,
      })
    },
  })

  // Figma (Design system): #84 / Žádost čeká na schválení · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-22798 (mobile: 19795-22912)
  // Figma (Design system): #84 / Termín byl změněn · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19806-13847 (mobile: 19806-13964)
  // Figma (Design system): #84 / Odhlášení bylo potvrzeno · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19806-14029 (mobile: 19806-14144)
  if (result) {
    const title = t(
      result.kind === "requested"
        ? "change.pendingTitle"
        : result.kind === "cancelled"
          ? "change.cancelledTitle"
          : "change.changedTitle",
    )
    return (
      <section
        className="flex max-w-196 flex-col gap-6"
        aria-live="polite"
      >
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <Card className="gap-3 p-4 sm:p-6">
          <h2 className="text-xl font-semibold">
            {result.kind === "requested"
              ? t(result.mode === "cancel" ? "change.pendingCancelStatus" : "change.pendingStatus")
              : result.kind === "cancelled"
                ? t("change.cancelledCardTitle")
                : (result.targetLabel ?? title)}
          </h2>
          {result.at ? <p>{t("change.sentAt", { date: formatDateTime(result.at) })}</p> : null}
          {result.kind !== "requested"
            ? result.details.map((detail) => <p key={detail}>{detail}</p>)
            : null}
          <p>
            {t(
              result.kind === "requested"
                ? "change.pendingMessage"
                : result.kind === "cancelled"
                  ? "change.cancelledMessage"
                  : "change.changedMessage",
            )}
          </p>
          {result.kind === "requested" ? <p>{t("change.pendingNotification")}</p> : null}
        </Card>
        <Button
          variant="ghost"
          size="lg"
          className="self-start"
          onClick={onBack}
        >
          {t("change.backToApplication")}
        </Button>
      </section>
    )
  }

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
    <section className="flex max-w-196 flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {t(mode === "cancel" ? "change.cancelTitle" : "change.title")}
      </h1>
      {mode === "change" ? (
        <p>{`${application.firstName} ${application.lastName} · ${application.eventName}`}</p>
      ) : null}
      {mode === "change" ? (
        <>
          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-medium"
              id="source-term-label"
            >
              {t("change.sourceTerm")}
            </label>
            <Select
              value={source?.id}
              onValueChange={setSourceId}
            >
              <SelectTrigger
                className="w-full sm:max-w-100"
                aria-labelledby="source-term-label"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-medium"
              id="target-term-label"
            >
              {t("change.targetTerm")}
            </label>
            <Select
              value={target?.id}
              onValueChange={setTargetId}
            >
              <SelectTrigger
                className="w-full sm:max-w-100"
                aria-labelledby="target-term-label"
              >
                <SelectValue placeholder={t("change.noAvailableTerms")} />
              </SelectTrigger>
              <SelectContent>
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
          <label
            className="text-sm font-medium"
            id="cancel-scope-label"
          >
            {t("change.cancelScope")}
          </label>
          <Select
            value={cancelId}
            onValueChange={setCancelId}
          >
            <SelectTrigger
              className="w-full sm:max-w-100"
              aria-labelledby="cancel-scope-label"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("change.allTerms", { count: active.length })}</SelectItem>
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
      )}
      <Card className="gap-3 p-4 sm:p-6">
        <h2 className="text-xl font-semibold">
          {t(mode === "cancel" ? "change.cancelImpact" : "change.impact")}
        </h2>
        {impactLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
        {mode === "change" ? <p>{t("change.noTransfer")}</p> : null}
        <p>{t(mode === "cancel" ? "change.cancelBed" : "change.changeBed")}</p>
      </Card>
      {mode === "change" || !options.data.canChangeImmediately ? (
        <Alert>
          <AlertTitle>
            {t(
              options.data.canChangeImmediately ? "change.immediateTitle" : "change.approvalTitle",
            )}
          </AlertTitle>
          <AlertDescription>
            {t(
              options.data.canChangeImmediately
                ? "change.immediateDescription"
                : "change.approvalDescription",
            )}
          </AlertDescription>
        </Alert>
      ) : null}
      {hasValidationError && !canSubmit ? (
        <Alert variant="destructive">
          <AlertDescription>{t("change.noAvailableTerms")}</AlertDescription>
        </Alert>
      ) : null}
      {mutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-3 sm:items-start">
        <Button
          size="lg"
          variant={
            mode === "cancel" && options.data.canChangeImmediately ? "destructive" : "default"
          }
          disabled={mutation.isPending}
          onClick={() =>
            canSubmit
              ? mutation.mutate({
                  details: removedImpactLines,
                  target: mode === "change" ? target : undefined,
                })
              : setHasValidationError(true)
          }
        >
          {t(
            mutation.isPending
              ? "change.saving"
              : !options.data.canChangeImmediately
                ? "change.requestSubmit"
                : mode === "cancel"
                  ? "change.confirmCancel"
                  : "change.confirmChange",
          )}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          disabled={mutation.isPending}
          onClick={onBack}
        >
          {t(mode === "cancel" ? "change.back" : "change.discard")}
        </Button>
      </div>
    </section>
  )
}
