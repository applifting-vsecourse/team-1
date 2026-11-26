import { createFileRoute } from "@tanstack/react-router"

import { ApplicationTransport } from "@/features/transport/components/ApplicationTransport"

// The organizer chooses the transport of a participant in the same dialog the participant has (D-191).
export const Route = createFileRoute(
  "/organizer/_app/events/$eventId/applications_/$applicationId_/transport",
)({
  component: OrganizerApplicationTransportPage,
})

function OrganizerApplicationTransportPage() {
  const { eventId, applicationId } = Route.useParams()
  return (
    <ApplicationTransport
      applicationId={applicationId}
      eventId={eventId}
      writer="organizer"
    />
  )
}
