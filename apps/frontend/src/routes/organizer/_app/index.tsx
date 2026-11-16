import { createFileRoute, redirect } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

import { lastOpenedEventQueryOptions } from "@/features/events/api/last-opened-event"

// After login (and from the sidebar item "Přehled") the organizer lands on the overview of the event
// they opened last (US-51); without one, or when it is gone, on the events list.
export const Route = createFileRoute("/organizer/_app/")({
  beforeLoad: async ({ context }) => {
    const eventId = await context.queryClient
      .fetchQuery(lastOpenedEventQueryOptions())
      .catch(() => null)
    if (eventId) {
      throw redirect({ to: ROUTES.organizer.event, params: { eventId }, replace: true })
    }
    throw redirect({ to: ROUTES.organizer.events, replace: true })
  },
})
