import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"

import { BoardEntryCard } from "@/features/board/components/BoardEntryCard"
import { ApplicationDetail } from "@/features/participant/components/ApplicationDetail"

export const Route = createFileRoute("/participant/_app/applications/$applicationId")({
  component: ParticipantApplicationPage,
})

// US-54 (U04): status of every term and the payment details of one application.
// Figma (Design system v2): U04 Moje přihláška · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15649-211
function ParticipantApplicationPage() {
  const { t } = useTranslation("participant")
  const { applicationId } = Route.useParams()

  return (
    <>
      <Seo title={t("detail.title")} />
      <ApplicationDetail
        applicationId={applicationId}
        boardEntry={<BoardEntryCard applicationId={applicationId} />}
      />
    </>
  )
}
