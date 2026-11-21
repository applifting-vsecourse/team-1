import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"

import { EventList } from "@/features/events/components/EventList"
import { NewEventPage } from "@/features/events/components/NewEventForm"

export const Route = createFileRoute("/organizer/_app/events/new")({
  component: NewEventRoute,
})

function NewEventRoute() {
  const { t } = useTranslation("events")

  return (
    <>
      <Seo title={t("new.title")} />
      <EventList />
      <NewEventPage />
    </>
  )
}
