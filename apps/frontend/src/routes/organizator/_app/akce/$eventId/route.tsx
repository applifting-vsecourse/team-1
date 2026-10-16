import { createFileRoute, Outlet } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { NavLink } from "@/components/atoms/NavLink"

// Event detail chrome: the sections of one event. Each tab is its own route
// file so streams A (terms, rooms) and D (overview, applications) never edit
// the same page.
export const Route = createFileRoute("/organizator/_app/akce/$eventId")({
  component: EventLayout,
})

function EventLayout() {
  const { eventId } = Route.useParams()

  return (
    <div className="flex flex-col gap-6">
      <nav
        aria-label="Části akce"
        className="flex flex-wrap gap-1 border-b border-border pb-2"
      >
        <NavLink
          to={ROUTES.organizer.event}
          params={{ eventId }}
          activeOptions={{ exact: true }}
        >
          Přehled
        </NavLink>
        <NavLink
          to={ROUTES.organizer.eventTerms}
          params={{ eventId }}
        >
          Termíny
        </NavLink>
        <NavLink
          to={ROUTES.organizer.eventRooms}
          params={{ eventId }}
        >
          Ubytování
        </NavLink>
        <NavLink
          to={ROUTES.organizer.eventApplications}
          params={{ eventId }}
        >
          Přihlášky
        </NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
