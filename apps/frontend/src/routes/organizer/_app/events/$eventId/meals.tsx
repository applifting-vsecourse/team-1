import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"

import { KitchenSummary } from "@/features/meals/components/KitchenSummary"

export const Route = createFileRoute("/organizer/_app/events/$eventId/meals")({
  component: EventMealsPage,
})

// US-64: meal counts and allergies per term for the kitchen.
function EventMealsPage() {
  const { t } = useTranslation("meals")
  const { eventId } = Route.useParams()

  return (
    <>
      <Seo title={t("kitchen.title")} />
      <KitchenSummary eventId={eventId} />
    </>
  )
}
