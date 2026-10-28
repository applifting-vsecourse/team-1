import { useQuery } from "@tanstack/react-query"
import { Link, useMatchRoute } from "@tanstack/react-router"
import {
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Gauge,
  LayoutGrid,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { NavLink } from "@/components/atoms/NavLink"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { eventQueryOptions } from "@/features/events/api/events"
import { termsSummary } from "@/features/events/lib/terms-summary"

/**
 * Head of every event page: back to the list, the event name with whether
 * the application is open, and the event's sections. From `md` up they are
 * tabs; on a phone one full-width button shows the current section and
 * opens a menu with all of them. It sticks under the top bar, so
 * the sections are one tap away without opening the drawer.
 */
// Figma (Design system): N8 Mobil · detail akce · výběr sekce · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14178-43230
// Figma (Design system): N9 Mobil · detail akce · výběr sekce otevřený · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14178-43273
// Figma (Design system): N / Event section switcher · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14179-986
// Figma (Design system): N / Event section menu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14179-995
// Figma (Design system): O / Event tabs · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14057-36915
// Figma (Design system): O04 Přehled akce · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12110-156
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

const SECTIONS = [
  { key: "overview", to: ROUTES.organizer.event, icon: LayoutGrid, exact: true },
  { key: "applications", to: ROUTES.organizer.eventApplications, icon: ClipboardList },
  { key: "capacity", to: ROUTES.organizer.eventCapacity, icon: Gauge },
  { key: "rooms", to: ROUTES.organizer.eventRooms, icon: BedDouble },
  { key: "terms", to: ROUTES.organizer.eventTerms, icon: CalendarDays },
] as const

function EventTabs({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const matchRoute = useMatchRoute()
  const params = { eventId }
  const activeIndex = Math.max(
    0,
    SECTIONS.findIndex((section) =>
      matchRoute({ to: section.to, params, fuzzy: !("exact" in section) }),
    ),
  )
  const active = SECTIONS[activeIndex]!
  const ActiveIcon = active.icon

  return (
    <nav aria-label={t("nav.eventSections")}>
      {/* Phone: sticks under the 56 px top bar and replaces the tabs. */}
      <div className="sticky top-14 z-20 -mx-4 bg-background px-4 py-2 md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-start gap-2 px-3 data-[state=open]:bg-muted"
            >
              <ActiveIcon
                aria-hidden
                className="size-4"
              />
              {t(`eventTabs.${active.key}`)}
              <ChevronDown
                aria-hidden
                className="ml-auto size-4"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-(--radix-dropdown-menu-trigger-width)"
          >
            {SECTIONS.map(({ key, to, icon: Icon }, index) => (
              <DropdownMenuItem
                key={key}
                asChild
                className={cn("h-10 gap-3", index === activeIndex && "bg-accent font-medium")}
              >
                <Link
                  to={to}
                  params={params}
                  aria-current={index === activeIndex ? "page" : undefined}
                >
                  <Icon aria-hidden />
                  {t(`eventTabs.${key}`)}
                  {index === activeIndex ? <Check className="ml-auto" /> : null}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="hidden gap-1 md:flex">
        {SECTIONS.map(({ key, to, ...section }) => (
          <NavLink
            key={key}
            to={to}
            params={params}
            activeOptions={"exact" in section ? { exact: true } : undefined}
          >
            {t(`eventTabs.${key}`)}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
