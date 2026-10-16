import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

export const Route = createFileRoute("/organizator/_app/ucet")({
  component: OrganizerAccountPage,
})

// Skeleton — US-02 (odhlášení, O30).
function OrganizerAccountPage() {
  return (
    <>
      <Seo title="Nastavení účtu" />
      <PageHeader
        title="Nastavení účtu"
        description="Připravuje se — US-02 (odhlášení, O30)."
      />
    </>
  )
}
