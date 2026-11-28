import { useQuery } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { SidebarLink } from "@/components/atoms/SidebarLink"

import { eventQueryOptions } from "@/features/events/api/events"
import { EventSectionLinks } from "@/features/events/components/EventSectionLinks"
import { EventStatusBadge } from "@/features/events/components/EventStatusBadge"

/**
 * The sidebar of an open event (navigation A, D-038): „← Všechny akce“ on top, the event's name with
 * its status, then the event's sections in their groups. It replaces the row of tabs above the
 * content, which didn't fit 1024–1280 px (#613).
 */
// Figma (Design system v2): F5 / Navigation / Sidebar organizátora · Kontext=Akce · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27890-4721
export function EventSidebarNav({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const { t: tEvents } = useTranslation("events")
  const { data: event } = useQuery(eventQueryOptions(eventId))

  return (
    <>
      <SidebarLink
        to={ROUTES.organizer.events}
        // The events list itself is not where we are: never the active marker here.
        activeOptions={{ exact: true }}
        icon={ArrowLeft}
        size="compact"
      >
        {tEvents("header.allEvents")}
      </SidebarLink>
      <div className="flex min-h-18 flex-col items-start gap-2 px-3 py-2">
        {event ? (
          <>
            <p className="text-base font-semibold wrap-anywhere">{event.name}</p>
            <EventStatusBadge isOpen={event.applicationsOpen} />
          </>
        ) : null}
      </div>
      <nav aria-label={t("nav.eventSections")}>
        <EventSectionLinks
          eventId={eventId}
          size="compact"
        />
      </nav>
    </>
  )
}
