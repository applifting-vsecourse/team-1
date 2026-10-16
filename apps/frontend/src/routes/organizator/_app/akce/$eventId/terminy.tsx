import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

export const Route = createFileRoute("/organizator/_app/akce/$eventId/terminy")({
  component: EventTermsPage,
})

// Skeleton — US-13, US-16.
function EventTermsPage() {
  return (
    <>
      <Seo title="Termíny" />
      <PageHeader
        title="Termíny"
        description="Připravuje se — US-13, US-16."
      />
    </>
  )
}
