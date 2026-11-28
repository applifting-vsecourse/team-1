import { useQuery } from "@tanstack/react-query"
import { Link, useMatchRoute } from "@tanstack/react-router"
import {
  BedDouble,
  Bus,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Gauge,
  LayoutGrid,
  Megaphone,
  Settings,
  Utensils,
  Wallet,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { BrandDivider } from "@/components/atoms/BrandDivider"
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
 * Head of every event page, the same on all sections: the round back button, the event name with
 * whether the application is open, „organization · dates“ and the orange BrandDivider (no band, no
 * illustration). Under it the event's sections: tabs from `md` up, on a phone one button with the
 * current section that opens a menu with all of them; it sticks under the 56 px header, so the
 * sections are one tap away.
 */
// Figma (Design system v2): F5 / Přehled akce · záhlaví a záložky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15398-536 (mobile 15398-598)
// Figma (Design system v2): F5 / Menu sekcí akce · Mobil · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=18359-20490
export function EventHeader({ eventId }: { eventId: string }) {
  const { t } = useTranslation("events")
  const { data: event } = useQuery(eventQueryOptions(eventId))

  return (
    <>
      <header className="flex min-w-0 flex-col gap-3">
        <div className="flex items-start gap-3 md:gap-4">
          <BackLink to={ROUTES.organizer.events}>{t("header.allEvents")}</BackLink>
          {event ? (
            <div className="flex min-w-0 flex-col gap-2 wrap-anywhere md:gap-1">
              <div className="flex flex-col items-start gap-2 md:flex-row md:flex-wrap md:items-center md:gap-x-3">
                <h1 className="min-w-0 text-2xl font-bold tracking-tight md:text-[32px]/10">
                  {event.name}
                </h1>
                <Badge variant={event.applicationsOpen ? "success" : "warning"}>
                  {event.applicationsOpen ? t("header.applicationsOpen") : t("list.statusClosed")}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {event.organizationName} · {termsSummary(event, t)}
              </p>
            </div>
          ) : (
            // Keeps the tabs from jumping while the event loads.
            <div className="h-18" />
          )}
        </div>
        <BrandDivider />
      </header>
      <EventTabs eventId={eventId} />
    </>
  )
}

const SECTIONS = [
  { key: "overview", to: ROUTES.organizer.event, icon: LayoutGrid, exact: true },
  { key: "applications", to: ROUTES.organizer.eventApplications, icon: ClipboardList },
  { key: "payments", to: ROUTES.organizer.eventPayments, icon: Wallet },
  { key: "capacity", to: ROUTES.organizer.eventCapacity, icon: Gauge },
  { key: "meals", to: ROUTES.organizer.eventMeals, icon: Utensils },
  { key: "rooms", to: ROUTES.organizer.eventRooms, icon: BedDouble },
  { key: "terms", to: ROUTES.organizer.eventTerms, icon: CalendarDays },
  { key: "transport", to: ROUTES.organizer.eventTransport, icon: Bus },
  { key: "program", to: ROUTES.organizer.eventProgram, icon: CalendarClock },
  { key: "board", to: ROUTES.organizer.eventBoard, icon: Megaphone },
  { key: "settings", to: ROUTES.organizer.eventSettings, icon: Settings },
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
    <nav
      aria-label={t("nav.eventSections")}
      // On a phone its 8 px padding (room under the header when stuck) is taken out of the page's 16 px gaps.
      className="sticky top-14 z-20 -my-2 bg-background md:static md:z-auto md:my-0"
    >
      {/* Phone: sticks under the 56 px header and replaces the tabs. */}
      <div className="-mx-4 bg-background px-4 py-2 md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-start gap-3 px-4 font-semibold data-[state=open]:bg-wash"
            >
              <ActiveIcon
                aria-hidden
                className="size-5"
              />
              {t(`eventTabs.${active.key}`)}
              <ChevronDown
                aria-hidden
                className="ml-auto size-5"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="flex w-(--radix-dropdown-menu-trigger-width) flex-col gap-1 overscroll-contain p-2"
          >
            {SECTIONS.map(({ key, to, icon: Icon }, index) => {
              const isActive = index === activeIndex
              return (
                <DropdownMenuItem
                  key={key}
                  asChild
                  // The current section as in the sidebar (nav A): grey surface, Semi Bold and the orange bar.
                  className={cn(
                    "h-12 shrink-0 gap-4 px-3 text-base [&_svg]:size-5",
                    isActive && "bg-nav-active font-semibold",
                  )}
                >
                  <Link
                    to={to}
                    params={params}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {isActive ? (
                      <span
                        aria-hidden="true"
                        className="absolute top-1/2 left-1 h-6 w-1 -translate-y-1/2 rounded-xs bg-nav-indicator"
                      />
                    ) : null}
                    <Icon
                      aria-hidden
                      className={isActive ? "text-foreground" : undefined}
                    />
                    {t(`eventTabs.${key}`)}
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="hidden min-w-0 gap-1 overflow-x-auto md:flex">
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
