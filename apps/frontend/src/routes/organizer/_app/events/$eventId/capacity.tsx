import { createFileRoute } from "@tanstack/react-router"

import { CapacityPage } from "@/features/events/components/CapacityPage"

export const Route = createFileRoute("/organizer/_app/events/$eventId/capacity")({
  validateSearch: (search: Record<string, unknown>): { termId?: string } => ({
    termId: typeof search.termId === "string" ? search.termId : undefined,
  }),
  component: EventCapacityPage,
})

function EventCapacityPage() {
  const { eventId } = Route.useParams()
  const { termId } = Route.useSearch()
  return (
    <CapacityPage
      eventId={eventId}
      initialTermId={termId}
    />
  )
}
