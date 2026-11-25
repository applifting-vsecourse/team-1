import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ParticipantHealthForm } from "@/features/health/components/ParticipantHealthForm"
import { ApplicationDetail } from "@/features/participant/components/ApplicationDetail"
import { ApplicationPreferencesDialog } from "@/features/participant/components/ApplicationPreferencesDialog"

export const Route = createFileRoute("/participant/_app/applications/$applicationId_/health")({
  component: ParticipantHealthPage,
})

// US-68: the participant's health restriction with the explicit consent.
function ParticipantHealthPage() {
  const { t } = useTranslation("health")
  const { applicationId } = Route.useParams()

  return (
    <>
      <ApplicationDetail applicationId={applicationId} />
      <ApplicationPreferencesDialog
        applicationId={applicationId}
        editor="health"
        title={t("title")}
      >
        <ParticipantHealthForm applicationId={applicationId} />
      </ApplicationPreferencesDialog>
    </>
  )
}
