import { createFileRoute, redirect } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

// The organizer has no dashboard (docs/PROJEKT.md, 2026-10-25): /organizer opens the events list.
export const Route = createFileRoute("/organizer/_app/")({
  beforeLoad: () => {
    throw redirect({ to: ROUTES.organizer.events, replace: true })
  },
})
