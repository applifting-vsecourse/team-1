import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"

import { occupancyQueryOptions } from "@/features/event-overview/api/occupancy"
import { RoomsPage } from "@/features/events/components/RoomsPage"

export const Route = createFileRoute("/organizer/_app/events/$eventId/rooms")({
  validateSearch: (search: Record<string, unknown>): { termId?: string } => ({
    termId: typeof search.termId === "string" ? search.termId : undefined,
  }),
  component: EventRoomsPage,
})

function EventRoomsPage() {
  const { t } = useTranslation("events")
  const { eventId } = Route.useParams()
  const { termId } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  // The occupancy lists every active term with its own room mode, room count and capacity.
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
    <RoomsPage
      eventId={eventId}
      termId={termId}
      terms={occupancy.data.terms}
      onSelectTerm={(next) => {
        void navigate({ search: { termId: next }, replace: true })
      }}
    />
  )
}
