import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { Seo } from "@/components/atoms/Seo"

import { eventQueryOptions } from "@/features/events/api/events"
import { MealOptionsEditor } from "@/features/meals/components/MealOptionsEditor"

export const Route = createFileRoute("/organizer/_app/events/$eventId/meals_/options")({
  component: EventMealOptionsPage,
})

// US-64: the meal restrictions the event offers on the application.
function EventMealOptionsPage() {
  const { t } = useTranslation("meals")
  const { eventId } = Route.useParams()
  const { data: event } = useQuery(eventQueryOptions(eventId))

  return (
    <>
      <Seo title={t("options.title")} />
      <BackLink
        to={ROUTES.organizer.eventMeals}
        params={{ eventId }}
      >
        {t("options.back")}
      </BackLink>
      <MealOptionsEditor
        eventId={eventId}
        eventName={event?.name}
      />
    </>
  )
}
