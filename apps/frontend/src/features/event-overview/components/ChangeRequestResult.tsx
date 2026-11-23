import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackButton } from "@/components/atoms/BackLink"
import { DetailItem } from "@/components/molecules/DetailItem"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateRange, formatDateTime } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import { eventChangeRequestQueryOptions } from "@/features/event-overview/api/changeRequests"
import { paymentQueryOptions } from "@/features/event-overview/api/payments"
import { ParticipantDetails } from "@/features/event-overview/components/ParticipantDetails"

// Figma: US-114 · Organizer decision · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK?node-id=21584-79854
export function ChangeRequestResult({
  eventId,
  requestId,
  applicationId,
  onBack,
}: {
  eventId: string
  requestId: string
  applicationId: string
  onBack: () => void
}) {
  const { t } = useTranslation("eventOverview")
  const request = useQuery(eventChangeRequestQueryOptions(eventId, requestId))
  const application = useQuery(paymentQueryOptions(applicationId))
  const item = request.data
  const isApproved = item?.status === "APPROVED"
  const hasRequestedTerms =
    item?.requestedTermIds.some((id) => !item.currentTermIds.includes(id)) ?? false
  const termList = (ids: string[]) =>
    ids.map((id) => {
      const term = item?.terms.find((candidate) => candidate.id === id)
      if (!term) return null
      const status = application.data?.terms.find((candidate) => candidate.termId === id)?.status
      return (
        <span
          key={id}
          className="flex flex-wrap items-center gap-2"
        >
          {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
          {status && <Badge variant="secondary">{t(`termStatus.state.${status}`)}</Badge>}
        </span>
      )
    })
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <BackButton onClick={onBack}>{t("changeRequests.back")}</BackButton>
      {request.isError ? (
        <ErrorState
          title={t("changeRequests.loadError")}
          error={request.error}
          onRetry={() => void request.refetch()}
        />
      ) : !item ? (
        <LoadingState />
      ) : (
        <>
          <Card className="gap-4 p-4 sm:p-6">
            <h2 className="text-2xl font-semibold">{item.participantName}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span>
                {t(hasRequestedTerms ? "changeRequests.changeType" : "changeRequests.cancelType")}
              </span>
              <Badge variant="secondary">
                {t(
                  item.status === "PENDING"
                    ? "changeRequests.pending"
                    : isApproved
                      ? "changeRequests.approvedBadge"
                      : "changeRequests.declinedBadge",
                )}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>
                {t("changeRequests.createdDate", { date: formatDateTime(item.createdAt) })}
              </span>
              {item.reviewedAt && (
                <span>
                  {t("changeRequests.reviewedDate", { date: formatDateTime(item.reviewedAt) })}
                </span>
              )}
            </div>
            {item.rejectionReason && (
              <DetailItem label={t("changeRequests.reason")}>{item.rejectionReason}</DetailItem>
            )}
            <DetailItem
              label={t(isApproved ? "changeRequests.previousTerms" : "changeRequests.current")}
            >
              {termList(
                isApproved
                  ? item.currentTermIds.filter((id) => !item.requestedTermIds.includes(id))
                  : item.currentTermIds,
              )}
            </DetailItem>
            {hasRequestedTerms && (
              <>
                <DetailItem
                  label={t(isApproved ? "changeRequests.newTerms" : "changeRequests.requested")}
                >
                  {termList(
                    item.requestedTermIds.filter((id) => !item.currentTermIds.includes(id)),
                  )}
                </DetailItem>
                <DetailItem label={t("changeRequests.price")}>
                  {formatCzk(item.currentPriceCzk)} → {formatCzk(item.requestedPriceCzk)}
                </DetailItem>
              </>
            )}
            {isApproved && (
              <p>
                {t(
                  hasRequestedTerms
                    ? "changeRequests.paymentNotice"
                    : "changeRequests.refundNotice",
                )}
              </p>
            )}
            {isApproved && hasRequestedTerms && (
              <Button
                asChild
                variant="outline"
                className="w-full sm:w-fit"
              >
                <Link
                  to={ROUTES.organizer.application}
                  params={{ eventId, applicationId }}
                >
                  {t("changeRequests.goToPayments")}
                </Link>
              </Button>
            )}
          </Card>
          {application.isError ? (
            <ErrorState
              title={t("payment.errorTitle")}
              error={application.error}
              onRetry={() => void application.refetch()}
            />
          ) : application.data ? (
            <ParticipantDetails application={application.data} />
          ) : (
            <LoadingState />
          )}
        </>
      )}
    </section>
  )
}
