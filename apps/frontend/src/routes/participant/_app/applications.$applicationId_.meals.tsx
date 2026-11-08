import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"

import { ParticipantMeals } from "@/features/meals/components/ParticipantMeals"

export const Route = createFileRoute("/participant/_app/applications/$applicationId_/meals")({
  component: ParticipantMealsPage,
})

// US-64: the participant's meal restrictions and allergies.
function ParticipantMealsPage() {
  const { t } = useTranslation("meals")
  const { applicationId } = Route.useParams()

  return (
    <>
      <Seo title={t("own.pageTitle")} />
      <ParticipantMeals applicationId={applicationId} />
    </>
  )
}
