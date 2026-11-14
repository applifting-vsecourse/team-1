import { useQuery } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { DetailItem } from "@/components/molecules/DetailItem"
import { ErrorState } from "@/components/molecules/ErrorState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatDateRange, formatDateTime } from "@/lib/date"

import { participantChangeRequestsQueryOptions } from "@/features/participant/api/changeRequests"

// Figma (Design system): #408 Detail · žádost odeslána · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=22640-39109 (mobile: 22640-39243)
// Figma (Design system): US-114 Detail přihlášky · Žádost čeká / Změna schválená / Žádost zamítnutá · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15928-9271 (mobile: 15928-9331)
export function ChangeRequestNotice({ applicationId }: { applicationId: string }) {
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
        return term ? formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true }) : ""
      })
      .filter(Boolean)
      .join(", ")
  const isCancel = request.requestedTermIds.length === 0
  const isPending = request.status === "PENDING"
  return (
    <>
      {isPending ? (
        <Alert aria-live="polite">
          <TriangleAlert aria-hidden />
          <AlertTitle className="line-clamp-none">{t("request.pendingTitle")}</AlertTitle>
          <AlertDescription>
            {t("request.pendingDescription", { date: formatDateTime(request.createdAt) })}
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
            variant="secondary"
            className="self-start"
          >
            {t(`request.status.${request.status}`)}
          </Badge>
        )}
        {isCancel ? (
          <DetailItem label={t("request.request")}>
            {t("request.wholeApplication", { count: request.currentTermIds.length })}
          </DetailItem>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailItem label={t("request.current")}>{labels(request.currentTermIds)}</DetailItem>
            <DetailItem label={t("request.requested")}>
              {labels(request.requestedTermIds)}
            </DetailItem>
          </div>
        )}
        <p>{t(`request.message.${request.status}.${isCancel ? "cancel" : "change"}`)}</p>
        {request.rejectionReason ? (
          <p>{t("request.reason", { reason: request.rejectionReason })}</p>
        ) : null}
      </Card>
    </>
  )
}
