import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

export const Route = createFileRoute("/organizator/_app/akce/nova")({
  component: NewEventPage,
})

// Skeleton — US-12.
function NewEventPage() {
  return (
    <>
      <Seo title="Nová akce" />
      <PageHeader
        title="Nová akce"
        description="Připravuje se — US-12."
      />
    </>
  )
}
