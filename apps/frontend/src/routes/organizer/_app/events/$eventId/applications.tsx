import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

export const Route = createFileRoute("/organizer/_app/events/$eventId/applications")({
  component: EventApplicationsPage,
})

// Skeleton — US-52, US-44.
function EventApplicationsPage() {
  const { t } = useTranslation(["eventOverview", "common"])

  return (
    <>
      <Seo title={t("applications.title")} />
      <PageHeader
        title={t("applications.title")}
        description={t("common:comingSoon", { story: "US-52, US-44" })}
      />
    </>
  )
}
