import { createFileRoute } from "@tanstack/react-router"

import { ProgramPage } from "@/features/program/components/ProgramPage"

export const Route = createFileRoute("/organizer/_app/events/$eventId/program")({
  component: ProgramRoute,
})

function ProgramRoute() {
  const { eventId } = Route.useParams()
  return <ProgramPage eventId={eventId} />
}
