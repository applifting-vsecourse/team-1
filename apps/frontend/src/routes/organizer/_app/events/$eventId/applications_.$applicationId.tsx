import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { LoadingState } from "@/components/molecules/LoadingState"

import { applicationHistoryQueryOptions } from "@/features/event-overview/api/applicationHistory"
import { paymentQueryOptions } from "@/features/event-overview/api/payments"
import { termStatusesQueryOptions } from "@/features/event-overview/api/termStatus"
import { ApplicationHistory } from "@/features/event-overview/components/ApplicationHistory"
import { ApplicationSubstituteRecords } from "@/features/event-overview/components/ApplicationSubstituteRecords"
import { PaymentDetail } from "@/features/event-overview/components/PaymentDetail"
import { TermStatuses } from "@/features/event-overview/components/TermStatuses"
import { organizerMealsQueryOptions } from "@/features/meals/api/meals"
import { OrganizerMealCard } from "@/features/meals/components/OrganizerMealDetails"

// Under the event (not nested in its applications list), so the page gets the event header
// and the Applications tab stays active.
export const Route = createFileRoute(
  "/organizer/_app/events/$eventId/applications_/$applicationId",
)({
  component: PaymentPage,
})

function PaymentPage() {
  const { eventId, applicationId } = Route.useParams()
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
