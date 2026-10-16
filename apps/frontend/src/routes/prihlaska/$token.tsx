import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"
import { PublicLayout } from "@/components/templates/PublicLayout"

export const Route = createFileRoute("/prihlaska/$token")({
  component: ApplicationFormPage,
})

// Skeleton — US-23 (form), US-40 (live price). Unknown token → 404.
function ApplicationFormPage() {
  return (
    <>
      <Seo title="Přihláška" />
      <PublicLayout>
        <PageHeader
          title="Přihláška"
          description="Připravuje se — US-23."
        />
      </PublicLayout>
    </>
  )
}
