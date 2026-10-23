import { createFileRoute, Outlet } from "@tanstack/react-router"

import { EventHeader } from "@/features/events/components/EventHeader"

// Event detail: each section is its own route file so streams A (terms, rooms)
// and D (overview, applications) never edit the same page. The sections are
// tabs in the event header above them.
export const Route = createFileRoute("/organizer/_app/events/$eventId")({
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
