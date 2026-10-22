import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Seo } from "@/components/atoms/Seo"

import { EventList } from "@/features/events/components/EventList"

export const Route = createFileRoute("/organizer/_app/events/")({
  // Set right after an event was created, to confirm it and highlight its row.
  validateSearch: z.object({ created: z.string().optional() }),
  component: EventsPage,
})

function EventsPage() {
  const { t } = useTranslation("events")
  const { created } = Route.useSearch()

  return (
    <>
      <Seo title={t("list.title")} />
      <EventList createdEventId={created} />
    </>
  )
}
