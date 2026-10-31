import { createFileRoute } from "@tanstack/react-router"

import { PaymentDetail } from "@/features/event-overview/components/PaymentDetail"
import { TermStatuses } from "@/features/event-overview/components/TermStatuses"

// Under the event (not nested in its applications list), so the page gets the event header
// and the Applications tab stays active.
export const Route = createFileRoute(
  "/organizer/_app/events/$eventId/applications_/$applicationId",
)({
  component: PaymentPage,
})

function PaymentPage() {
  const { applicationId } = Route.useParams()
  return (
    <div className="flex flex-col gap-6">
      <PaymentDetail applicationId={applicationId} />
      <TermStatuses applicationId={applicationId} />
    </div>
  )
}
