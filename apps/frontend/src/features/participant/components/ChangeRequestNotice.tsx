import { useQuery } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { DetailItem } from "@/components/molecules/DetailItem"
import { ErrorState } from "@/components/molecules/ErrorState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatDateTime } from "@/lib/date"
import { termLine } from "@/lib/term-label"

import type { MyApplicationTerm } from "@/features/participant/api/applications"
import { participantChangeRequestsQueryOptions } from "@/features/participant/api/changeRequests"

// Figma (Design system v2): #408 Detail · žádost odeslána · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-39109 (mobile: 22640-39243)
// Figma (Design system v2): US-114 Detail přihlášky · Žádost čeká / Změna schválená / Žádost zamítnutá · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15928-9271 (mobile: 15928-9331)
// Figma (Design system v2): #552 Detail · žádost schválena / zamítnuta / čeká · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27254-146307
export function ChangeRequestNotice({
  applicationId,
  terms,
}: {
  applicationId: string
  terms: Pick<MyApplicationTerm, "termId" | "status">[]
}) {
  const { t } = useTranslation("participant")
  const query = useQuery(participantChangeRequestsQueryOptions(applicationId))
  if (query.isPending) return null
  if (query.isError) {
    return (
      <ErrorState
        title={t("request.loadError")}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )
  }
  const request = query.data[0]
  if (!request) return null
  const labels = (ids: string[]) =>
    ids
      .map((id) => {
        const term = request.terms.find((term) => term.id === id)
        return term ? termLine(term) : ""
      })
      .filter(Boolean)
      .join(", ")
  // The kind of the request follows from what it adds and removes: no new term is a cancellation
  // (of the whole application or of some terms), a new term is a change.
  const removedIds = request.currentTermIds.filter((id) => !request.requestedTermIds.includes(id))
  const addedIds = request.requestedTermIds.filter((id) => !request.currentTermIds.includes(id))
  const isCancel = addedIds.length === 0
  const isWholeApplication = request.requestedTermIds.length === 0
  const isPending = request.status === "PENDING"
  const hasRemovedBed = removedIds.some((id) =>
    terms.some((term) => term.termId === id && term.status === "CONFIRMED"),
  )
  // A pending request is explained by the alert above; the card only repeats the outcome of a decided one.
  const messageKey = isPending
    ? null
    : (`request.message.${request.status as "APPROVED" | "REJECTED"}.${isCancel ? "cancel" : "change"}` as const)
  const outcome = (
    <>
      {messageKey ? <p>{t(messageKey)}</p> : null}
      {request.status === "REJECTED" && request.rejectionReason ? (
        <DetailItem label={t("request.reason")}>{request.rejectionReason}</DetailItem>
      ) : null}
    </>
  )
  return (
    <>
      {isPending ? (
        <Alert aria-live="polite">
          <TriangleAlert aria-hidden />
          <AlertTitle className="line-clamp-none">{t("request.pendingTitle")}</AlertTitle>
          <AlertDescription>
            {t(
              hasRemovedBed ? "request.pendingDescription" : "request.pendingDescriptionWithoutBed",
              {
                date: formatDateTime(request.createdAt),
              },
            )}
          </AlertDescription>
        </Alert>
      ) : null}
      <Card
        className="gap-4 p-4 sm:p-6"
        aria-live="polite"
      >
        <h2 className="text-xl font-semibold tracking-tight">
          {t(isCancel ? "request.cancelTitle" : "request.changeTitle")}
        </h2>
        {isPending ? null : (
          <Badge
            variant={request.status === "APPROVED" ? "positive" : "danger"}
            className="self-start"
          >
            {t(`request.status.${request.status}`)}
          </Badge>
        )}
        {!isPending && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{t("request.createdDate", { date: formatDateTime(request.createdAt) })}</span>
            {request.reviewedAt && (
              <span>{t("request.reviewedDate", { date: formatDateTime(request.reviewedAt) })}</span>
            )}
          </div>
        )}
        {isCancel ? (
          <div className={isPending ? "contents" : "flex flex-col gap-3 border-t pt-4"}>
            <DetailItem label={t("request.request")}>
              {isWholeApplication
                ? t("request.wholeApplication", { count: request.currentTermIds.length })
                : t("request.onlyTerms", { terms: labels(removedIds) })}
            </DetailItem>
            {outcome}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {removedIds.length > 0 ? (
              <DetailItem label={t("request.current")}>{labels(removedIds)}</DetailItem>
            ) : null}
            <DetailItem label={t("request.requested")}>{labels(addedIds)}</DetailItem>
          </div>
        )}
        {isCancel ? null : outcome}
      </Card>
    </>
  )
}
