import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"

import { ApplicationDetail } from "@/features/participant/components/ApplicationDetail"

export const Route = createFileRoute("/participant/_app/applications/$applicationId")({
  component: ParticipantApplicationPage,
})

// US-54 (U04): status of every term and the payment details of one application.
// Figma (Design system): U04 Moje přihláška · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11988-11066
function ParticipantApplicationPage() {
  const { t } = useTranslation("participant")
  const { applicationId } = Route.useParams()

  return (
    <>
      <Seo title={t("detail.title")} />
      <ApplicationDetail applicationId={applicationId} />
    </>
  )
}
