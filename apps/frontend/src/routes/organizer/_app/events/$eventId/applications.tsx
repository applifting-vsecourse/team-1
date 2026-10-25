import { createFileRoute } from "@tanstack/react-router"

import { ApplicationsPage } from "@/features/event-overview/components/ApplicationsPage"
import { applicationsSearchSchema } from "@/features/event-overview/lib/applications-search"

export const Route = createFileRoute("/organizer/_app/events/$eventId/applications")({
  // Preserve the filters linked from occupancy counts (US-29).
  validateSearch: applicationsSearchSchema,
  component: EventApplicationsPage,
})

function EventApplicationsPage() {
  const { eventId } = Route.useParams()
  const filters = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <ApplicationsPage
      eventId={eventId}
      filters={filters}
      onFiltersChange={(search) => void navigate({ search, replace: true })}
    />
  )
}
