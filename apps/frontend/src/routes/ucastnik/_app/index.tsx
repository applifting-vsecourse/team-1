import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

export const Route = createFileRoute("/ucastnik/_app/")({
  component: ParticipantApplicationsPage,
})

// Skeleton — US-54.
function ParticipantApplicationsPage() {
  return (
    <>
      <Seo title="Moje přihláška" />
      <PageHeader
        title="Moje přihláška"
        description="Připravuje se — US-54."
      />
    </>
  )
}
