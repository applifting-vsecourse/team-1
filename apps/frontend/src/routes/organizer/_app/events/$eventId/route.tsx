import { createFileRoute, Outlet } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { NavLink } from "@/components/atoms/NavLink"

// Event detail chrome: the sections of one event. Each tab is its own route
// file so streams A (terms, rooms) and D (overview, applications) never edit
// the same page.
export const Route = createFileRoute("/organizer/_app/events/$eventId")({
  component: EventLayout,
})

function EventLayout() {
  const { eventId } = Route.useParams()
  const { t } = useTranslation(["common", "events"])

  return (
    <div className="flex flex-col gap-6">
      <nav
        aria-label={t("nav.eventSections")}
        className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:px-0"
      >
        <NavLink
          to={ROUTES.organizer.event}
          params={{ eventId }}
          activeOptions={{ exact: true }}
        >
          {t("eventTabs.overview")}
        </NavLink>
        <NavLink
          to={ROUTES.organizer.eventTerms}
          params={{ eventId }}
        >
          {t("eventTabs.terms")}
        </NavLink>
        <NavLink
          to={ROUTES.organizer.eventRooms}
          params={{ eventId }}
        >
          {t("eventTabs.rooms")}
        </NavLink>
        <NavLink
          to={ROUTES.organizer.eventApplications}
          params={{ eventId }}
        >
          {t("eventTabs.applications")}
        </NavLink>
        <NavLink
          to={ROUTES.organizer.eventCapacity}
          params={{ eventId }}
        >
          {t("events:capacity.tab")}
        </NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
