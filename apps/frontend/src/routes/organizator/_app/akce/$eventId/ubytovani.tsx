import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

export const Route = createFileRoute("/organizator/_app/akce/$eventId/ubytovani")({
  component: EventRoomsPage,
})

// Skeleton — US-14.
function EventRoomsPage() {
  return (
    <>
      <Seo title="Ubytování" />
      <PageHeader
        title="Ubytování"
        description="Připravuje se — US-14."
      />
    </>
  )
}
