import { createFileRoute } from "@tanstack/react-router"

import { BoardAdminPage } from "@/features/board/components/BoardAdminPage"

export const Route = createFileRoute("/organizer/_app/events/$eventId/board")({
  component: BoardRoute,
})

function BoardRoute() {
  const { eventId } = Route.useParams()
  return <BoardAdminPage eventId={eventId} />
}
