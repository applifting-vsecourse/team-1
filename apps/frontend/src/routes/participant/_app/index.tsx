import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

import { ApplicationList } from "@/features/participant/components/ApplicationList"

export const Route = createFileRoute("/participant/_app/")({
  component: ParticipantApplicationsPage,
})

// US-54 (U01): every application under the signed-in participant account.
// Figma (Design system v2): US-54 / Moje přihlášky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15649-2 (360 px: node-id=15649-122)
function ParticipantApplicationsPage() {
  const { t } = useTranslation("participant")

  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("applications.title")} />
      <PageHeader
        hasBand
        motif="forms"
        title={t("applications.title")}
        description={t("applications.description")}
      />
      <ApplicationList />
    </div>
  )
}
