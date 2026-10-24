import { createFileRoute } from "@tanstack/react-router"

import { PaymentDetail } from "@/features/event-overview/components/PaymentDetail"

// Under the event (not nested in its applications list), so the page gets the event header
// and the Applications tab stays active.
export const Route = createFileRoute(
  "/organizer/_app/events/$eventId/applications_/$applicationId",
)({
  component: PaymentPage,
})

function PaymentPage() {
  const { applicationId } = Route.useParams()
  return <PaymentDetail applicationId={applicationId} />
}
