import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

export const Route = createFileRoute("/organizer/_app/events/new")({
  component: NewEventPage,
})

// Skeleton — US-12.
function NewEventPage() {
  const { t } = useTranslation(["events", "common"])

  return (
    <>
      <Seo title={t("new.title")} />
      <PageHeader
        title={t("new.title")}
        description={t("common:comingSoon", { story: "US-12" })}
      />
    </>
  )
}
