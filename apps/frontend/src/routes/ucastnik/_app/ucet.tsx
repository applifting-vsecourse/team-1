import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

export const Route = createFileRoute("/ucastnik/_app/ucet")({
  component: ParticipantAccountPage,
})

// Skeleton — US-02 (odhlášení, U13).
function ParticipantAccountPage() {
  return (
    <>
      <Seo title="Nastavení účtu" />
      <PageHeader
        title="Nastavení účtu"
        description="Připravuje se — US-02 (odhlášení, U13)."
      />
    </>
  )
}
