import { useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouterState } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { NavLink } from "@/components/atoms/NavLink"
import { Badge } from "@/components/ui/badge"

import { eventQueryOptions } from "@/features/events/api/events"
import { termsSummary } from "@/features/events/lib/terms-summary"

/**
 * Head of every event page: back to the list, the event name with whether
 * the application is open, and the event's sections as tabs. The tabs
 * replace the event items the sidebar used to have, so on a phone the
 * sections are one tap away without opening the drawer: they stick under
 * the top bar and scroll sideways, keeping the active one in view.
 */
// Figma (Design system): O / Event tabs · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14057-36915
// Figma (Design system): O04 Přehled akce · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12110-156
// Figma (Design system): M10 Přehled akce · záložky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14070-41302
export function EventHeader({ eventId }: { eventId: string }) {
  const { t } = useTranslation("events")
  const { data: event } = useQuery(eventQueryOptions(eventId))

  return (
    <header className="flex flex-col gap-3">
      <BackLink to={ROUTES.organizer.events}>{t("header.allEvents")}</BackLink>
      {event ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-2xl font-bold md:text-4xl">{event.name}</h1>
            <Badge variant={event.applicationsOpen ? "success" : "warning"}>
              {event.applicationsOpen ? t("header.applicationsOpen") : t("list.statusClosed")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground md:text-base">{termsSummary(event, t)}</p>
        </div>
      ) : (
        // Keeps the tabs from jumping while the event loads.
        <div className="h-18" />
      )}
      <EventTabs eventId={eventId} />
    </header>
  )
}

function EventTabs({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const listRef = useRef<HTMLDivElement>(null)
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-status="active"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [pathname])

  const params = { eventId }

  return (
    // Sticks under the 56 px mobile top bar; on desktop the bar scrolls away, so the tabs do too.
    <nav
      aria-label={t("nav.eventSections")}
      className="sticky top-14 z-20 -mx-4 bg-background px-4 py-2 md:static md:mx-0 md:px-0"
    >
      <div
        ref={listRef}
        className="flex [scrollbar-width:none] gap-1 overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)] md:[mask-image:none]"
      >
        <NavLink
          to={ROUTES.organizer.event}
          params={params}
          activeOptions={{ exact: true }}
        >
          {t("eventTabs.overview")}
        </NavLink>
        <NavLink
          to={ROUTES.organizer.eventApplications}
          params={params}
        >
          {t("eventTabs.applications")}
        </NavLink>
        <NavLink
          to={ROUTES.organizer.eventCapacity}
          params={params}
        >
          {t("eventTabs.capacity")}
        </NavLink>
        <NavLink
          to={ROUTES.organizer.eventRooms}
          params={params}
        >
          {t("eventTabs.rooms")}
        </NavLink>
        <NavLink
          to={ROUTES.organizer.eventTerms}
          params={params}
        >
          {t("eventTabs.terms")}
        </NavLink>
      </div>
    </nav>
  )
}
