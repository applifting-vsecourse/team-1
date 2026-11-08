import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"

import { OrganizerHealth } from "@/features/health/components/OrganizerHealth"

// Under the event like the payment detail, so the event header stays and Applications stays active.
export const Route = createFileRoute(
  "/organizer/_app/events/$eventId/applications_/$applicationId_/health",
)({
  component: OrganizerHealthPage,
})

// US-68: the health restriction of a participant, for organizers only.
function OrganizerHealthPage() {
  const { t } = useTranslation("health")
  const { eventId, applicationId } = Route.useParams()

  return (
    <>
      <Seo title={t("title")} />
      <OrganizerHealth
        eventId={eventId}
        applicationId={applicationId}
      />
    </>
  )
}
