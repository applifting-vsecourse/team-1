import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"
import { PublicLayout } from "@/components/templates/PublicLayout"

export const Route = createFileRoute("/prihlaska/potvrzeni/$accessToken")({
  component: ApplicationConfirmationPage,
})

// Skeleton — US-25. Secret URL, so it survives a reload and can go in the e-mail.
function ApplicationConfirmationPage() {
  return (
    <>
      <Seo title="Přihláška odeslána" />
      <PublicLayout>
        <PageHeader
          title="Přihláška odeslána"
          description="Připravuje se — US-25."
        />
      </PublicLayout>
    </>
  )
}
