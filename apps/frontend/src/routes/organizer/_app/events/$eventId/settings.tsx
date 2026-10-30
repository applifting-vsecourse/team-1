import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"

import { EventSettings } from "@/features/events/components/EventSettings"

export const Route = createFileRoute("/organizer/_app/events/$eventId/settings")({
  component: EventSettingsPage,
})

function EventSettingsPage() {
  const { eventId } = Route.useParams()
  const { t } = useTranslation("events")

  return (
    <>
      <Seo title={t("evaluationMode.title")} />
      <EventSettings eventId={eventId} />
    </>
  )
}
