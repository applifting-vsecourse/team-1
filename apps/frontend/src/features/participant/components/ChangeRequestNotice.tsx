import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatDateRange } from "@/lib/date"

import { participantChangeRequestsQueryOptions } from "@/features/participant/api/changeRequests"

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
  return (
    <Card
      className="gap-4 p-4 sm:p-6"
      aria-live="polite"
    >
      <h2 className="text-lg font-semibold">
        {t(request.requestedTermIds.length === 0 ? "request.cancelTitle" : "request.changeTitle")}
      </h2>
      <Badge
        variant="secondary"
        className="self-start"
      >
        {t(`request.status.${request.status}`)}
      </Badge>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm text-muted-foreground">{t("request.current")}</p>
          <p>{labels(request.currentTermIds)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t("request.requested")}</p>
          <p>
            {request.requestedTermIds.length
              ? labels(request.requestedTermIds)
              : t("request.cancelAll")}
          </p>
        </div>
      </div>
      <p>{t(`request.message.${request.status}`)}</p>
      {request.rejectionReason ? (
        <p>{t("request.reason", { reason: request.rejectionReason })}</p>
      ) : null}
    </Card>
  )
}
