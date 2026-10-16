import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

export const Route = createFileRoute("/organizer/_app/events/$eventId/")({
  component: EventOverviewPage,
})

// Skeleton — US-29.
function EventOverviewPage() {
  const { t } = useTranslation(["eventOverview", "common"])

  return (
    <>
      <Seo title={t("overview.title")} />
      <PageHeader
        title={t("overview.title")}
        description={t("common:comingSoon", { story: "US-29" })}
      />
    </>
  )
}
