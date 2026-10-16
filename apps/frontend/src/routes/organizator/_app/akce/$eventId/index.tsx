import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

export const Route = createFileRoute("/organizator/_app/akce/$eventId/")({
  component: EventOverviewPage,
})

// Skeleton — US-29 (obsazenost po termínech).
function EventOverviewPage() {
  return (
    <>
      <Seo title="Přehled akce" />
      <PageHeader
        title="Přehled akce"
        description="Připravuje se — US-29 (obsazenost po termínech)."
      />
    </>
  )
}
