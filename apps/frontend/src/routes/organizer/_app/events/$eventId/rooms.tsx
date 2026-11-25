import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"

import { occupancyQueryOptions } from "@/features/event-overview/api/occupancy"
import { RoomsPage } from "@/features/events/components/RoomsPage"

export const Route = createFileRoute("/organizer/_app/events/$eventId/rooms")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { termId?: string; view?: "overview" | "requests" } => ({
    termId: typeof search.termId === "string" ? search.termId : undefined,
    // The room assignment is the page itself; only the other views (US-36, #514) are named in the link.
    view: search.view === "overview" || search.view === "requests" ? search.view : undefined,
  }),
  component: EventRoomsPage,
})

function EventRoomsPage() {
  const { t } = useTranslation("events")
  const { eventId } = Route.useParams()
  const { termId, view } = Route.useSearch()
  const navigate = Route.useNavigate()
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
      view={view ?? "assignment"}
      terms={occupancy.data.terms}
      onSelectTerm={(next) => {
        void navigate({
          search: (prev) => ({ ...prev, termId: next }),
          replace: true,
          // Stay where the organizer is instead of jumping to the top.
          resetScroll: false,
        })
      }}
      onSelectView={(next) => {
        void navigate({
          search: (prev) => ({ ...prev, view: next === "assignment" ? undefined : next }),
          replace: true,
          resetScroll: false,
        })
      }}
    />
  )
}
