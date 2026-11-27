import { useQuery } from "@tanstack/react-query"

import { LoadingState } from "@/components/molecules/LoadingState"

import { applicationHistoryQueryOptions } from "@/features/event-overview/api/applicationHistory"
import { paymentQueryOptions } from "@/features/event-overview/api/payments"
import { termStatusesQueryOptions } from "@/features/event-overview/api/termStatus"
import { ApplicationHistory } from "@/features/event-overview/components/ApplicationHistory"
import { ApplicationSubstituteRecords } from "@/features/event-overview/components/ApplicationSubstituteRecords"
import { OnBehalfLinks } from "@/features/event-overview/components/OnBehalfLinks"
import { PaymentDetail } from "@/features/event-overview/components/PaymentDetail"
import { TermStatuses } from "@/features/event-overview/components/TermStatuses"
import { organizerMealsQueryOptions } from "@/features/meals/api/meals"
import { OrganizerMealCard } from "@/features/meals/components/OrganizerMealDetails"

/**
 * The application as the organizer sees it. Its own route renders it; so does a route that opens
 * a dialog above it, so the application stays visible behind the dialog.
 */
export function ApplicationDetailPage({
  eventId,
  applicationId,
}: {
  eventId: string
  applicationId: string
}) {
  const payment = useQuery(paymentQueryOptions(applicationId))
  const meals = useQuery(organizerMealsQueryOptions(eventId, applicationId))
  const termStatuses = useQuery(termStatusesQueryOptions(applicationId))
  const history = useQuery(applicationHistoryQueryOptions(applicationId))
  // Wait for the first result of each section. Later retries belong to the individual cards.
  if (
    [payment, meals, termStatuses, history].some((query) => query.isPending && !query.isFetched)
  ) {
    return <LoadingState />
  }
  return (
    <div className="flex flex-col gap-6">
      <PaymentDetail
        applicationId={applicationId}
        query={payment}
        termStatuses={termStatuses.data}
      />
      <OrganizerMealCard
        eventId={eventId}
        query={meals}
      />
      <OnBehalfLinks
        eventId={eventId}
        applicationId={applicationId}
      />
      <TermStatuses
        applicationId={applicationId}
        query={termStatuses}
        application={payment.data}
      />
      <ApplicationSubstituteRecords
        applicationId={applicationId}
        terms={termStatuses.data}
      />
      <ApplicationHistory query={history} />
    </div>
  )
}
