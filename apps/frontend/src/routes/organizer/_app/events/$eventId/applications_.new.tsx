import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"

import { useSession } from "@/features/auth/hooks/useSession"
import { ManualApplicationPage } from "@/features/event-overview/components/ManualApplicationPage"
import { eventQueryOptions } from "@/features/events/api/events"
import { termsQueryOptions } from "@/features/events/api/terms"

export const Route = createFileRoute("/organizer/_app/events/$eventId/applications_/new")({
  component: NewApplicationRoute,
})

function NewApplicationRoute() {
  const { eventId } = Route.useParams()
  const { t } = useTranslation("eventOverview")
  const event = useQuery(eventQueryOptions(eventId))
  const terms = useQuery(termsQueryOptions(eventId))
  const { user } = useSession()
  if (event.isPending || terms.isPending) return <LoadingState />
  if (event.isError || terms.isError) {
    return (
      <ErrorState
        title={t("manual.title")}
        error={event.error ?? terms.error ?? new Error(t("applications.error"))}
        onRetry={() => {
          void event.refetch()
          void terms.refetch()
        }}
      />
    )
  }
  return (
    <ManualApplicationPage
      eventId={eventId}
      eventName={event.data.name}
      terms={terms.data.filter((term) => term.cancelledAt === null)}
      organizerName={user?.name ?? ""}
    />
  )
}
