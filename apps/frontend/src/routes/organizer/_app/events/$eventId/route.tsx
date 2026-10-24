import { createFileRoute, Outlet } from "@tanstack/react-router"

import { ErrorPage } from "@/components/pages/ErrorPage"
import { HTTPError } from "@/lib/api-client"
import { ForbiddenError } from "@/lib/errors"

import { eventQueryOptions } from "@/features/events/api/events"
import { EventHeader } from "@/features/events/components/EventHeader"

// Event detail: each section is its own route file so streams A (terms, rooms)
// and D (overview, applications) never edit the same page. The sections are
// tabs in the event header above them.
export const Route = createFileRoute("/organizer/_app/events/$eventId")({
  // Another organization's event is the 403 page (US-10), not a failed section:
  // the ForbiddenError is rethrown to the organizer area, which shows it in place
  // of the whole area (S16). Other errors are left to the sections, which show
  // them with a retry.
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(eventQueryOptions(params.eventId))
    } catch (error) {
      if (error instanceof HTTPError && error.response.status === 403) throw new ForbiddenError()
    }
  },
  errorComponent: ({ error }) => {
    if (error instanceof ForbiddenError) throw error
    return <ErrorPage error={error} />
  },
  component: EventLayout,
})

function EventLayout() {
  const { eventId } = Route.useParams()

  return (
    <>
      <EventHeader eventId={eventId} />
      <Outlet />
    </>
  )
}
