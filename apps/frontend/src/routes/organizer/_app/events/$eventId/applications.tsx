import { useQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

import { ApplicationsPage } from "@/features/event-overview/components/ApplicationsPage"
import { applicationsSearchSchema } from "@/features/event-overview/lib/applications-search"
import {
  readApplicationsSearch,
  saveApplicationsSearch,
} from "@/features/event-overview/lib/applications-search-session"
import { eventQueryOptions } from "@/features/events/api/events"

export const Route = createFileRoute("/organizer/_app/events/$eventId/applications")({
  // Preserve the filters linked from occupancy counts (US-29).
  validateSearch: applicationsSearchSchema,
  beforeLoad: ({ params, search, preload: isPreload }) => {
    if (isPreload) return
    if (Object.values(search).some((value) => value !== undefined)) {
      saveApplicationsSearch(params.eventId, search)
      return
    }
    const saved = readApplicationsSearch(params.eventId)
    if (Object.values(saved).some((value) => value !== undefined)) {
      throw redirect({
        to: ROUTES.organizer.eventApplications,
        params,
        search: saved,
        replace: true,
      })
    }
  },
  component: EventApplicationsPage,
})

function EventApplicationsPage() {
  const { eventId } = Route.useParams()
  const { data: event } = useQuery(eventQueryOptions(eventId))
  const filters = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <ApplicationsPage
      eventId={eventId}
      isAutomatic={event?.evaluationMode === "AUTOMATIC"}
      filters={filters}
      onFiltersChange={(search) => {
        saveApplicationsSearch(eventId, search)
        void navigate({ search, replace: true })
      }}
    />
  )
}
