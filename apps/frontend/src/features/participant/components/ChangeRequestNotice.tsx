import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { DetailItem } from "@/components/molecules/DetailItem"
import { ErrorState } from "@/components/molecules/ErrorState"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatDateTime } from "@/lib/date"
import { termDates, termLine } from "@/lib/term-label"

import type { MyApplicationTerm, TermPayment } from "@/features/participant/api/applications"
import { participantChangeRequestsQueryOptions } from "@/features/participant/api/changeRequests"

// Figma (Design system v2): #408 Detail · žádost odeslána · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-39109 (mobile: 22640-39243)
// Figma (Design system v2): US-114 Detail přihlášky · Žádost čeká / Změna schválená / Žádost zamítnutá · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15928-9271 (mobile: 15928-9331)
// Figma (Design system v2): #552 Detail · žádost schválena / zamítnuta / čeká · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27254-146307
// Figma (Design system v2): #652 Čekající žádost o změnu termínu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27281-31090 (mobile: 27281-31195)
// Figma (Design system v2): #652 Čekající žádost o odhlášení · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27282-165507 (mobile: 27282-165612)
export function ChangeRequestNotice({
  applicationId,
  terms,
  payments,
}: {
  applicationId: string
  terms: Pick<MyApplicationTerm, "termId" | "status">[]
  payments: Pick<TermPayment, "termId" | "owedCzk">[]
}) {
  const { t } = useTranslation(["participant", "notifications"])
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
  const labels = (ids: string[], formatTerm: typeof termLine = termLine) =>
    ids
      .map((id) => {
        const term = request.terms.find((term) => term.id === id)
        return term ? formatTerm(term) : ""
      })
      .filter(Boolean)
      .join(", ")
  // The kind of the request follows from what it adds and removes: no new term is a cancellation
  // (of the whole application or of some terms), a new term is a change.
  const removedIds = request.currentTermIds.filter((id) => !request.requestedTermIds.includes(id))
  const addedIds = request.requestedTermIds.filter((id) => !request.currentTermIds.includes(id))
  const isCancel = addedIds.length === 0
  const isWholeApplication = request.requestedTermIds.length === 0
  if (request.status === "PENDING") {
    const currentIds = removedIds.length > 0 ? removedIds : request.currentTermIds
    const currentAttendance = request.terms
      .filter((term) => currentIds.includes(term.id))
      .map((term) => {
        const attendance = terms.find((item) => item.termId === term.id)
        if (!attendance) return termDates(term)
        const payment = payments.find((item) => item.termId === term.id)
        const status =
          attendance.status === "CONFIRMED" && payment
            ? t(payment.owedCzk > 0 ? "request.confirmedWithDebt" : "request.confirmedPaid")
            : t(`notifications:status.${attendance.status}`)
        return `${termDates(term)} · ${status}`
      })
    return (
      <Card
        className="gap-4 rounded-xl p-4 shadow-none"
        aria-live="polite"
      >
        <h2 className="text-2xl font-bold tracking-tight">
          {t(isCancel ? "request.pendingCancelTitle" : "request.pendingChangeTitle")}
        </h2>
        <Badge
          variant="warning"
          className="border-0"
        >
          {t("request.status.PENDING")}
        </Badge>
        {!isCancel && (
          <DetailItem label={t("request.requestedTerm")}>{labels(addedIds, termDates)}</DetailItem>
        )}
        {currentAttendance.length > 0 && (
          <DetailItem label={t("request.currentAttendance")}>
            {currentAttendance.join(", ")}
          </DetailItem>
        )}
        <p>{t("request.pendingAttendance")}</p>
      </Card>
    )
  }
  return (
    <Card
      className="gap-4 p-4 sm:p-6"
      aria-live="polite"
    >
      <h2 className="text-xl font-semibold tracking-tight">
        {t(isCancel ? "request.cancelTitle" : "request.changeTitle")}
      </h2>
      <Badge
        variant={request.status === "APPROVED" ? "positive" : "danger"}
        className="self-start"
      >
        {t(`request.status.${request.status}`)}
      </Badge>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>{t("request.createdDate", { date: formatDateTime(request.createdAt) })}</span>
        {request.reviewedAt && (
          <span>{t("request.reviewedDate", { date: formatDateTime(request.reviewedAt) })}</span>
        )}
      </div>
      {isCancel ? (
        <DetailItem label={t("request.request")}>
          {isWholeApplication
            ? t("request.wholeApplication", { count: request.currentTermIds.length })
            : t("request.onlyTerms", { terms: labels(removedIds) })}
        </DetailItem>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {removedIds.length > 0 ? (
            <DetailItem label={t("request.current")}>{labels(removedIds)}</DetailItem>
          ) : null}
          <DetailItem label={t("request.requested")}>{labels(addedIds)}</DetailItem>
        </div>
      )}
      <p>{t(`request.message.${request.status}.${isCancel ? "cancel" : "change"}`)}</p>
      {request.rejectionReason ? (
        <p>{t("request.reason", { reason: request.rejectionReason })}</p>
      ) : null}
    </Card>
  )
}
