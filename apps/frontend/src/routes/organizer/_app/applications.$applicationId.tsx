import { createFileRoute } from "@tanstack/react-router"

import { PaymentDetail } from "@/features/event-overview/components/PaymentDetail"

export const Route = createFileRoute("/organizer/_app/applications/$applicationId")({
  component: PaymentPage,
})

function PaymentPage() {
  const { applicationId } = Route.useParams()
  return <PaymentDetail applicationId={applicationId} />
}
