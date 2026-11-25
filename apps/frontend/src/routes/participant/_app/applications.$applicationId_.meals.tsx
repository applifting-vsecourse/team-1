import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ParticipantMeals } from "@/features/meals/components/ParticipantMeals"
import { ApplicationDetail } from "@/features/participant/components/ApplicationDetail"
import { ApplicationPreferencesDialog } from "@/features/participant/components/ApplicationPreferencesDialog"

export const Route = createFileRoute("/participant/_app/applications/$applicationId_/meals")({
  component: ParticipantMealsPage,
})

// US-64: the participant's meal restrictions and allergies.
function ParticipantMealsPage() {
  const { t } = useTranslation("meals")
  const { applicationId } = Route.useParams()

  return (
    <>
      <ApplicationDetail applicationId={applicationId} />
      <ApplicationPreferencesDialog
        applicationId={applicationId}
        editor="meals"
        title={t("own.pageTitle")}
      >
        <ParticipantMeals applicationId={applicationId} />
      </ApplicationPreferencesDialog>
    </>
  )
}
