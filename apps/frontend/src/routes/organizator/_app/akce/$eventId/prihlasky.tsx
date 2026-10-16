import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

export const Route = createFileRoute("/organizator/_app/akce/$eventId/prihlasky")({
  component: EventApplicationsPage,
})

// Skeleton — US-52, US-44.
function EventApplicationsPage() {
  return (
    <>
      <Seo title="Přihlášky" />
      <PageHeader
        title="Přihlášky"
        description="Připravuje se — US-52, US-44."
      />
    </>
  )
}
