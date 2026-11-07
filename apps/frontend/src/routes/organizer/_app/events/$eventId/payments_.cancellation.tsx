import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"

import { CancellationTermsPage } from "@/features/events/components/CancellationTermsPage"

// A sub-page of Payments (the Finance section): the escaped `payments_` keeps the payments
// overview from becoming its layout, the URL still sits under /payments.
export const Route = createFileRoute("/organizer/_app/events/$eventId/payments_/cancellation")({
  component: CancellationTermsRoute,
})

function CancellationTermsRoute() {
  const { eventId } = Route.useParams()
  const { t } = useTranslation("events")

  return (
    <>
      <Seo title={t("cancellationTerms.title")} />
      <CancellationTermsPage eventId={eventId} />
    </>
  )
}
