import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

export const Route = createFileRoute("/organizer/_app/events/$eventId/rooms")({
  component: EventRoomsPage,
})

// Skeleton — US-14.
function EventRoomsPage() {
  const { t } = useTranslation(["events", "common"])

  return (
    <>
      <Seo title={t("rooms.title")} />
      <PageHeader
        title={t("rooms.title")}
        description={t("common:comingSoon", { story: "US-14" })}
      />
    </>
  )
}
