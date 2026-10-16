import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

export const Route = createFileRoute("/organizer/_app/events/")({
  component: EventsPage,
})

// Skeleton — US-12 (O02).
function EventsPage() {
  const { t } = useTranslation(["events", "common"])

  return (
    <>
      <Seo title={t("list.title")} />
      <PageHeader
        title={t("list.title")}
        description={t("common:comingSoon", { story: "US-12 (O02)" })}
      />
    </>
  )
}
