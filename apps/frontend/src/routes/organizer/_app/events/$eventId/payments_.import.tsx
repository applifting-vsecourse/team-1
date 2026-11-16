import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { BankStatementImportPage } from "@/features/event-overview/components/BankStatementImportPage"
import { eventQueryOptions } from "@/features/events/api/events"

// A sub-page of Payments (Finance): the escaped `payments_` keeps the payments overview from
// becoming its layout, the URL still sits under /payments.
export const Route = createFileRoute("/organizer/_app/events/$eventId/payments_/import")({
  component: BankStatementImportRoute,
})

function BankStatementImportRoute() {
  const { eventId } = Route.useParams()
  const { data: event } = useQuery(eventQueryOptions(eventId))
  return (
    <BankStatementImportPage
      eventId={eventId}
      eventName={event?.name}
    />
  )
}
