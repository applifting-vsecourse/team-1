import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { PendingButton } from "@/components/atoms/PendingButton"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { apiErrorCode } from "@/lib/api-client"
import { formatDateRange, formatDateTime } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { notify } from "@/lib/notify"

import {
  decideChangeRequest,
  eventChangeRequestsQueryOptions,
  type EventChangeRequest,
} from "@/features/event-overview/api/changeRequests"
import { occupancyQueryOptions } from "@/features/event-overview/api/occupancy"
import { ChangeRequestResult } from "@/features/event-overview/components/ChangeRequestResult"

const termLabels = (request: EventChangeRequest, ids: string[]) =>
  ids
    .map((id) => {
      const term = request.terms.find((term) => term.id === id)
      return term ? formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true }) : ""
    })
    .filter(Boolean)
    .join(", ")

// Figma v2: US-114 Přihlášky · Žádosti o změnu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=21584-78141
export function ChangeRequestsPanel({ eventId }: { eventId: string }) {
  const { t } = useTranslation("eventOverview")
  const query = useQuery(eventChangeRequestsQueryOptions(eventId))
  const occupancy = useQuery(occupancyQueryOptions(eventId))
  const client = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDeclining, setDeclining] = useState(false)
  const [completed, setCompleted] = useState<EventChangeRequest | null>(null)
  const [reason, setReason] = useState("")
  const mutation = useMutation({
    mutationFn: ({
      request,
      decision,
      reason,
    }: {
      request: EventChangeRequest
      decision: "approve" | "reject"
      reason?: string
    }) => decideChangeRequest(eventId, request.id, decision, reason),
    onError: () => setDeclining(false),
    onSuccess: async (_data, variables) => {
      await client.invalidateQueries({ queryKey: ["eventOverview"] })
      await client.invalidateQueries({ queryKey: ["events", eventId, "occupancy"] })
      setDeclining(false)
      setSelectedId(null)
      setReason("")
      if (variables.request.kind === "TERMS") setCompleted(variables.request)
      notify.success(
        t(variables.decision === "approve" ? "changeRequests.approved" : "changeRequests.rejected"),
      )
    },
  })
  if (completed?.eventId === eventId) {
    return (
      <ChangeRequestResult
        eventId={eventId}
        requestId={completed.id}
        applicationId={completed.applicationId}
        onBack={() => setCompleted(null)}
      />
    )
  }
  if (query.isPending) return <LoadingState />
  if (query.isError) {
    return (
      <ErrorState
        title={t("changeRequests.loadError")}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )
  }
  const failureCode = apiErrorCode(mutation.error)
  const isStale = failureCode === "CHANGE_REQUEST_NOT_PENDING"
  const hasCapacityChanged = failureCode === "CAPACITY_EXCEEDED"
  const request = query.data.find((item) => item.id === selectedId)
  const summary = (item: EventChangeRequest) =>
    item.kind === "HEALTH"
      ? t("changeRequests.healthSummary")
      : item.requestedTermIds.length === 0
        ? t("changeRequests.cancelSummary", { current: termLabels(item, item.currentTermIds) })
        : t("changeRequests.changeSummary", {
            current: termLabels(item, item.currentTermIds),
            requested: termLabels(item, item.requestedTermIds),
          })
  // The row in the queue: what kind of request (muted label) and what it asks for.
  const requestType = (item: EventChangeRequest) =>
    item.kind === "HEALTH"
      ? t("changeRequests.healthSummary")
      : t(
          item.requestedTermIds.length === 0
            ? "changeRequests.cancelType"
            : "changeRequests.changeType",
        )
  const requestValue = (item: EventChangeRequest) =>
    item.requestedTermIds.length === 0
      ? t("changeRequests.cancelValue", { current: termLabels(item, item.currentTermIds) })
      : t("changeRequests.changeValue", {
          current: termLabels(item, item.currentTermIds),
          requested: termLabels(item, item.requestedTermIds),
        })
  const freePlaces = (item: EventChangeRequest, termId: string) => {
    const term = occupancy.data?.terms.find((term) => term.id === termId)
    return term?.byGender ? term.byGender[item.participantGender].free : term?.free
  }
  const reasonField = (
    <div className="flex flex-col gap-2">
      <Label htmlFor="change-request-reason">{t("changeRequests.reason")}</Label>
      <Textarea
        id="change-request-reason"
        className="min-h-32 rounded-xl shadow-none"
        value={reason}
        maxLength={1000}
        placeholder={t("changeRequests.reasonPlaceholder")}
        onChange={(event) => setReason(event.target.value)}
      />
    </div>
  )
  return (
    <section className="flex min-w-0 flex-col gap-4">
      {query.data.length === 0 ? (
        <Card className="p-6">
          <p>{t("changeRequests.empty")}</p>
        </Card>
      ) : (
        query.data.map((item) => (
          <Card
            key={item.id}
            className="min-w-0 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-6"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-semibold tracking-tight">{item.participantName}</h3>
                <Badge variant="neutral">{t("changeRequests.pending")}</Badge>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">{requestType(item)}</p>
                {item.kind === "TERMS" ? <p className="break-words">{requestValue(item)}</p> : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("changeRequests.submitted", { date: formatDateTime(item.createdAt) })}
              </p>
            </div>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => {
                mutation.reset()
                setDeclining(false)
                setSelectedId(item.id)
                setReason("")
              }}
            >
              {t("changeRequests.review")}
            </Button>
          </Card>
        ))
      )}
      <Dialog
        open={Boolean(request)}
        onOpenChange={(isOpen) => {
          if (!isOpen && !mutation.isPending) setSelectedId(null)
        }}
      >
        {request ? (
          <DialogContent className="h-dvh max-h-dvh max-w-none overflow-y-auto rounded-none border-0 p-4 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-160 sm:rounded-lg sm:border sm:p-6">
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl">{t("changeRequests.review")}</DialogTitle>
              <DialogDescription className="sr-only">{summary(request)}</DialogDescription>
            </DialogHeader>
            <div>
              <p className="text-sm text-muted-foreground">{t("changeRequests.participant")}</p>
              <p>{request.participantName}</p>
            </div>
            {request.kind === "HEALTH" ? (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("changeRequests.healthCurrent")}
                  </p>
                  <p className="break-words whitespace-pre-line">{request.currentHealthNote}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("changeRequests.healthRequested")}
                  </p>
                  <p className="break-words whitespace-pre-line">
                    {request.requestedHealthNote === ""
                      ? t("changeRequests.healthRemoved")
                      : request.requestedHealthNote}
                  </p>
                </div>
                <p>{t("changeRequests.healthNote")}</p>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">{t("changeRequests.current")}</p>
                  <p>{termLabels(request, request.currentTermIds)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("changeRequests.requested")}</p>
                  <p>
                    {request.requestedTermIds.length
                      ? termLabels(request, request.requestedTermIds)
                      : t("changeRequests.cancelAll")}
                  </p>
                </div>
                {request.requestedTermIds
                  .filter((id) => !request.currentTermIds.includes(id))
                  .map((id) => (
                    <div key={id}>
                      <p className="text-sm text-muted-foreground">
                        {t("changeRequests.capacity", { term: termLabels(request, [id]) })}
                      </p>
                      <p>
                        {freePlaces(request, id) === undefined
                          ? t("changeRequests.checkAtApproval")
                          : `${t("changeRequests.freeBeds", { count: freePlaces(request, id) })} · ${t("changeRequests.checkAtApproval")}`}
                      </p>
                    </div>
                  ))}
                {request.requestedTermIds.length ? (
                  <div>
                    <p className="text-sm text-muted-foreground">{t("changeRequests.price")}</p>
                    <p>
                      {formatCzk(request.currentPriceCzk)} → {formatCzk(request.requestedPriceCzk)}
                    </p>
                  </div>
                ) : null}
                <p>
                  {t(
                    request.requestedTermIds.length
                      ? "changeRequests.changeNote"
                      : "changeRequests.cancelNote",
                  )}
                </p>
              </>
            )}
            {request.kind === "HEALTH" && reasonField}
            {mutation.error ? (
              <Alert variant="destructive">
                <AlertDescription>{mutation.error.message}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-col gap-2">
              {!isStale && (
                <>
                  <PendingButton
                    isPending={
                      mutation.isPending &&
                      mutation.variables?.request.id === request.id &&
                      mutation.variables.decision === "approve"
                    }
                    disabled={mutation.isPending || hasCapacityChanged}
                    onClick={() => mutation.mutate({ request, decision: "approve" })}
                  >
                    {t("changeRequests.approve")}
                  </PendingButton>
                  <PendingButton
                    isPending={
                      mutation.isPending &&
                      mutation.variables?.request.id === request.id &&
                      mutation.variables.decision === "reject"
                    }
                    variant="destructive"
                    disabled={mutation.isPending}
                    onClick={() =>
                      request.kind === "HEALTH"
                        ? mutation.mutate({ request, decision: "reject", reason })
                        : setDeclining(true)
                    }
                  >
                    {t("changeRequests.reject")}
                  </PendingButton>
                </>
              )}
              {(isStale || hasCapacityChanged) && (
                <Button
                  type="button"
                  disabled={query.isFetching || occupancy.isFetching}
                  onClick={async () => {
                    const [requests, places] = await Promise.all([
                      query.refetch(),
                      occupancy.refetch(),
                    ])
                    if (requests.isSuccess && places.isSuccess) mutation.reset()
                  }}
                >
                  {t("changeRequests.refresh")}
                </Button>
              )}
              <Button
                variant="ghost"
                className="self-start"
                disabled={mutation.isPending}
                onClick={() => setSelectedId(null)}
              >
                {t("changeRequests.back")}
              </Button>
            </div>
            {request.kind !== "HEALTH" && (
              <Dialog
                open={isDeclining}
                onOpenChange={(isOpen) => {
                  if (!mutation.isPending) setDeclining(isOpen)
                }}
              >
                <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:max-w-160 sm:p-6">
                  <DialogHeader className="text-left">
                    <DialogTitle>{t("changeRequests.reject")}</DialogTitle>
                    <DialogDescription>
                      {request.participantName} · {summary(request)}
                    </DialogDescription>
                  </DialogHeader>
                  <p>
                    {t("changeRequests.declineKeepsTerms", {
                      terms: termLabels(request, request.currentTermIds),
                    })}
                  </p>
                  {reasonField}
                  <p className="text-sm text-muted-foreground">{t("changeRequests.reasonHint")}</p>
                  <PendingButton
                    isPending={
                      mutation.isPending &&
                      mutation.variables?.request.id === request.id &&
                      mutation.variables.decision === "reject"
                    }
                    variant="destructive"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ request, decision: "reject", reason })}
                  >
                    {t("changeRequests.reject")}
                  </PendingButton>
                  <Button
                    variant="outline"
                    disabled={mutation.isPending}
                    onClick={() => setDeclining(false)}
                  >
                    {t("changeRequests.backToRequest")}
                  </Button>
                </DialogContent>
              </Dialog>
            )}
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  )
}
