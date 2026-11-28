import { createFileRoute } from "@tanstack/react-router"

import { OrganizerArrangements } from "@/features/participant/components/OrganizerArrangements"

// The organizer writes roommate wishes and the stay of a participant, as the participant would (D-191).
export const Route = createFileRoute(
  "/organizer/_app/events/$eventId/applications_/$applicationId_/arrangements",
)({
  component: OrganizerArrangementsPage,
})

function OrganizerArrangementsPage() {
  const { eventId, applicationId } = Route.useParams()
  return (
    <OrganizerArrangements
      eventId={eventId}
      applicationId={applicationId}
    />
  )
}
