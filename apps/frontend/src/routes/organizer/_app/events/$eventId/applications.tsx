import { useQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

import { ApplicationsPage } from "@/features/event-overview/components/ApplicationsPage"
import { applicationsSearchSchema } from "@/features/event-overview/lib/applications-search"
import {
  readApplicationsSearch,
  saveApplicationsSearch,
  withoutPage,
} from "@/features/event-overview/lib/applications-search-session"
import { eventQueryOptions } from "@/features/events/api/events"

export const Route = createFileRoute("/organizer/_app/events/$eventId/applications")({
  // Preserve the filters linked from occupancy counts (US-29).
  validateSearch: applicationsSearchSchema,
  beforeLoad: ({ params, search: fullSearch, preload: isPreload }) => {
    if (isPreload) return
    const search = withoutPage(fullSearch)
    if (Object.values(search).some((value) => value !== undefined)) {
      saveApplicationsSearch(params.eventId, search)
      return
    }
    // A link to a page alone is a link to the unfiltered list.
    if (fullSearch.page !== undefined) return
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
      onFiltersChange={(search, options) => {
        saveApplicationsSearch(eventId, search)
        // Turning the page is a step Back returns from; typing or choosing a filter is not.
        void navigate({ search, replace: !options?.isPush })
      }}
    />
  )
}
