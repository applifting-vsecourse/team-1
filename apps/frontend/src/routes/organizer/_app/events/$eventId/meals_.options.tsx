import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"

import { MealOptionsEditor } from "@/features/meals/components/MealOptionsEditor"

// Beside `meals` (not under it), so the event header stays and Meals stays the active section.
export const Route = createFileRoute("/organizer/_app/events/$eventId/meals_/options")({
  component: EventMealOptionsPage,
})

// US-64: the meal restrictions the event offers on the application.
function EventMealOptionsPage() {
  const { t } = useTranslation("meals")
  const { eventId } = Route.useParams()

  return (
    <>
      <Seo title={t("options.title")} />
      <MealOptionsEditor eventId={eventId} />
    </>
  )
}
