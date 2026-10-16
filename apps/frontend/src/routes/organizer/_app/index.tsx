import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

export const Route = createFileRoute("/organizer/_app/")({
  component: OrganizerDashboardPage,
})

// Skeleton — US-02 (dashboard O01).
function OrganizerDashboardPage() {
  const { t } = useTranslation(["eventOverview", "common"])

  return (
    <>
      <Seo title={t("dashboard.title")} />
      <PageHeader
        title={t("dashboard.title")}
        description={t("common:comingSoon", { story: "US-02 (dashboard O01)" })}
      />
    </>
  )
}
