import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

export const Route = createFileRoute("/organizator/_app/akce/")({
  component: EventsPage,
})

// Skeleton — US-12 (seznam akcí podle pořadatele, O02).
function EventsPage() {
  return (
    <>
      <Seo title="Akce" />
      <PageHeader
        title="Akce"
        description="Připravuje se — US-12 (seznam akcí podle pořadatele, O02)."
      />
    </>
  )
}
