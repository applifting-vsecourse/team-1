import { useQuery } from "@tanstack/react-query"
import { BedDouble, CalendarRange, ClipboardList, LayoutGrid } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { SidebarLink } from "@/components/atoms/SidebarLink"

import { eventQueryOptions } from "@/features/events/api/events"

/**
 * The sections of the open event, under the area navigation: organization,
 * event name and one sidebar item per section page.
 */
// Figma (Design system): O04 Přehled akce, Navigace vybrané akce · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12110-156
export function EventSidebarNav({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const { data: event } = useQuery(eventQueryOptions(eventId))

  return (
    <div
      role="group"
      aria-label={t("nav.eventSections")}
      className="flex flex-col gap-2 pt-2"
    >
      {event ? (
        <>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {event.organizationName}
          </p>
          <p className="text-sm font-medium">{event.name}</p>
        </>
      ) : null}
      <SidebarLink
        to={ROUTES.organizer.event}
        params={{ eventId }}
        activeOptions={{ exact: true }}
        icon={LayoutGrid}
      >
        {t("eventTabs.overview")}
      </SidebarLink>
      <SidebarLink
        to={ROUTES.organizer.eventApplications}
        params={{ eventId }}
        icon={ClipboardList}
      >
        {t("eventTabs.applications")}
      </SidebarLink>
      <SidebarLink
        to={ROUTES.organizer.eventRooms}
        params={{ eventId }}
        icon={BedDouble}
      >
        {t("eventTabs.rooms")}
      </SidebarLink>
      <SidebarLink
        to={ROUTES.organizer.eventTerms}
        params={{ eventId }}
        icon={CalendarRange}
      >
        {t("eventTabs.terms")}
      </SidebarLink>
    </div>
  )
}
