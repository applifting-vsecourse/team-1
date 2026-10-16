import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

export const Route = createFileRoute("/organizer/_app/events/$eventId/terms")({
  component: EventTermsPage,
})

// Skeleton — US-13, US-16.
function EventTermsPage() {
  const { t } = useTranslation(["events", "common"])

  return (
    <>
      <Seo title={t("terms.title")} />
      <PageHeader
        title={t("terms.title")}
        description={t("common:comingSoon", { story: "US-13, US-16" })}
      />
    </>
  )
}
