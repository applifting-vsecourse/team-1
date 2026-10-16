import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

export const Route = createFileRoute("/participant/_app/")({
  component: ParticipantApplicationsPage,
})

// Skeleton — US-54.
function ParticipantApplicationsPage() {
  const { t } = useTranslation(["participant", "common"])

  return (
    <>
      <Seo title={t("applications.title")} />
      <PageHeader
        title={t("applications.title")}
        description={t("common:comingSoon", { story: "US-54" })}
      />
    </>
  )
}
