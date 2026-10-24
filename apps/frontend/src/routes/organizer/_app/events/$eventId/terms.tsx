import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"

import { EventTerms } from "@/features/events/components/EventTerms"

export const Route = createFileRoute("/organizer/_app/events/$eventId/terms")({
  component: EventTermsPage,
})

function EventTermsPage() {
  const { eventId } = Route.useParams()
  const { t } = useTranslation("events")

  return (
    <>
      <Seo title={t("terms.title")} />
      <EventTerms eventId={eventId} />
    </>
  )
}
