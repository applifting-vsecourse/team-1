import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"

import { occupancyQueryOptions } from "@/features/event-overview/api/occupancy"
import { RoomsPage } from "@/features/events/components/RoomsPage"
import { roomsSearchSchema, withPage, withTerm } from "@/features/events/lib/rooms-search"

export const Route = createFileRoute("/organizer/_app/events/$eventId/rooms")({
  validateSearch: roomsSearchSchema,
  component: EventRoomsPage,
})

function EventRoomsPage() {
  const { t } = useTranslation("events")
  const { eventId } = Route.useParams()
  const { termId, view, page } = Route.useSearch()
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
      page={(page ?? 1) - 1}
      onPageChange={(next, options) => {
        // A page the organizer picks goes to the history (Back returns to the previous one).
        void navigate({
          search: (prev) => withPage(prev, next),
          replace: options?.isReplace ?? false,
          resetScroll: false,
        })
      }}
      terms={occupancy.data.terms}
      onSelectTerm={(next) => {
        void navigate({
          search: (prev) => withTerm(prev, next),
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
