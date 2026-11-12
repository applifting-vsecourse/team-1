import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"

import { occupancyQueryOptions } from "@/features/event-overview/api/occupancy"
import { RoomExtraBedsPage } from "@/features/events/components/RoomExtraBedsPage"

// Beside `rooms` (not under it), so the event header stays and Accommodation stays the active section.
export const Route = createFileRoute("/organizer/_app/events/$eventId/rooms_/extra-beds")({
  validateSearch: (search: Record<string, unknown>): { termId: string; roomId: string } => ({
    termId: typeof search.termId === "string" ? search.termId : "",
    roomId: typeof search.roomId === "string" ? search.roomId : "",
  }),
  component: EventRoomExtraBedsPage,
})

// US-80: extra beds (přistýlky) of one room in one term.
function EventRoomExtraBedsPage() {
  const { t } = useTranslation("events")
  const { eventId } = Route.useParams()
  const { termId, roomId } = Route.useSearch()
  const navigate = Route.useNavigate()
  const occupancy = useQuery(occupancyQueryOptions(eventId))
  if (!occupancy.data) {
    return occupancy.isError ? (
      <ErrorState
        title={t("rooms.loadFailed")}
        error={occupancy.error}
        onRetry={() => {
          void occupancy.refetch()
        }}
      />
    ) : (
      <LoadingState />
    )
  }
  return (
    <RoomExtraBedsPage
      eventId={eventId}
      termId={termId}
      roomId={roomId}
      terms={occupancy.data.terms}
      onSelectRoom={(nextTermId, nextRoomId) => {
        void navigate({ search: { termId: nextTermId, roomId: nextRoomId }, replace: true })
      }}
    />
  )
}
