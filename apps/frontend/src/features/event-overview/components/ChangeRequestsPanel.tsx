import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDate, formatDateRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { notify } from "@/lib/notify"

import {
  decideChangeRequest,
  eventChangeRequestsQueryOptions,
  type EventChangeRequest,
} from "@/features/event-overview/api/changeRequests"
import { occupancyQueryOptions } from "@/features/event-overview/api/occupancy"

const termLabels = (request: EventChangeRequest, ids: string[]) =>
  ids
    .map((id) => {
      const term = request.terms.find((term) => term.id === id)
      return term ? formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true }) : ""
    })
    .filter(Boolean)
    .join(", ")

// Figma (Design system): US-114 Přihlášky · Fronta žádostí / Posoudit změnu termínu / Posoudit odhlášení · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15928-8145 (mobile: 15928-8214)
export function ChangeRequestsPanel({ eventId }: { eventId: string }) {
  const { t } = useTranslation("eventOverview")
  const query = useQuery(eventChangeRequestsQueryOptions(eventId))
  const occupancy = useQuery(occupancyQueryOptions(eventId))
  const client = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const mutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approve" | "reject" }) =>
      decideChangeRequest(eventId, id, decision, reason),
    onSuccess: async (_data, variables) => {
      await client.invalidateQueries({ queryKey: ["eventOverview"] })
      await client.invalidateQueries({ queryKey: ["events", eventId, "occupancy"] })
      setSelectedId(null)
      setReason("")
      notify.success(
        t(variables.decision === "approve" ? "changeRequests.approved" : "changeRequests.rejected"),
      )
    },
  })
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
  const request = query.data.find((item) => item.id === selectedId)
  const summary = (item: EventChangeRequest) =>
    item.requestedTermIds.length === 0
      ? t("changeRequests.cancelSummary", { current: termLabels(item, item.currentTermIds) })
      : t("changeRequests.changeSummary", {
          current: termLabels(item, item.currentTermIds),
          requested: termLabels(item, item.requestedTermIds),
        })
  const freePlaces = (item: EventChangeRequest, termId: string) => {
    const term = occupancy.data?.terms.find((term) => term.id === termId)
    return term?.byGender ? term.byGender[item.participantGender].free : term?.free
  }
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="text-2xl font-semibold tracking-tight">{t("changeRequests.title")}</h2>
      {query.data.length === 0 ? (
        <Card className="p-6">
          <p>{t("changeRequests.empty")}</p>
        </Card>
      ) : (
        query.data.map((item) => (
          <Card
            key={item.id}
            className="min-w-0 gap-4 p-4 sm:p-6"
          >
            <h3 className="text-lg font-semibold">{item.participantName}</h3>
            <p className="break-words">{summary(item)}</p>
            <Badge
              variant="secondary"
              className="self-start"
            >
              {t("changeRequests.pending")}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {t("changeRequests.submitted", { date: formatDate(item.createdAt) })}
            </p>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="change-request-reason">{t("changeRequests.reason")}</Label>
              <Input
                id="change-request-reason"
                value={reason}
                maxLength={1000}
                placeholder={t("changeRequests.reasonPlaceholder")}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
            {mutation.error ? (
              <Alert variant="destructive">
                <AlertDescription>{mutation.error.message}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-col gap-2">
              <Button
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ id: request.id, decision: "approve" })}
              >
                {t("changeRequests.approve")}
              </Button>
              <Button
                variant="destructive"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ id: request.id, decision: "reject" })}
              >
                {t("changeRequests.reject")}
              </Button>
              <Button
                variant="ghost"
                className="self-start"
                disabled={mutation.isPending}
                onClick={() => setSelectedId(null)}
              >
                {t("changeRequests.back")}
              </Button>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  )
}
