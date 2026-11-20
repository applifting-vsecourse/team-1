import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { Seo } from "@/components/atoms/Seo"

import { ParticipantHealthForm } from "@/features/health/components/ParticipantHealthForm"

export const Route = createFileRoute("/participant/_app/applications/$applicationId_/health")({
  component: ParticipantHealthPage,
})

// US-68: the participant's health restriction with the explicit consent.
function ParticipantHealthPage() {
  const { t } = useTranslation("health")
  const { applicationId } = Route.useParams()

  return (
    <>
      <Seo title={t("title")} />
      <BackLink
        to={ROUTES.participant.application}
        params={{ applicationId }}
      >
        {t("back")}
      </BackLink>
      <ParticipantHealthForm applicationId={applicationId} />
    </>
  )
}
