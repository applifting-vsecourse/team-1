import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

export const Route = createFileRoute("/organizator/_app/")({
  component: OrganizerDashboardPage,
})

// Skeleton — US-02 (dashboard O01).
function OrganizerDashboardPage() {
  return (
    <>
      <Seo title="Přehled" />
      <PageHeader
        title="Přehled"
        description="Připravuje se — US-02 (dashboard O01)."
      />
    </>
  )
}
