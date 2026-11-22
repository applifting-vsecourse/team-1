import { useQuery } from "@tanstack/react-query"
import { Link, useMatchRoute } from "@tanstack/react-router"
import {
  BedDouble,
  Bus,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Gauge,
  LayoutGrid,
  Settings,
  Utensils,
  Wallet,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { BrandDivider } from "@/components/atoms/BrandDivider"
import { HeadingBand } from "@/components/atoms/HeadingBand"
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
// Figma v2: application detail https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22475-86190 and settings https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19395-33879.
// Figma v2: event header and tabs (US-51 overview) · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20580-44169; mobile section switcher (Navigace akce / Přehled / 360) https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=18359-20490
export function EventHeader({ eventId }: { eventId: string }) {
  const { t } = useTranslation("events")
  const match = useMatchRoute()
  const matches = (to: (typeof ROUTES.organizer)[keyof typeof ROUTES.organizer]) =>
    Boolean(match({ to, params: { eventId }, fuzzy: true }))
  const isHealth = matches(ROUTES.organizer.applicationHealth)
  const isCompact =
    matches(ROUTES.organizer.eventSettings) ||
    (matches(ROUTES.organizer.application) && !isHealth) ||
    matches(ROUTES.organizer.eventTransport) ||
    matches(ROUTES.organizer.eventCancellationTerms) ||
    matches(ROUTES.organizer.newApplication)
  const isProgram = matches(ROUTES.organizer.eventProgram)
  const { data: event } = useQuery(eventQueryOptions(eventId))

  const heading = (
    <div className="flex flex-col items-start gap-3">
      <BackLink to={ROUTES.organizer.events}>{t("header.allEvents")}</BackLink>
      {event ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground md:text-base">
            {event.organizationName}
          </span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="min-w-0 text-2xl font-bold break-words md:text-[32px]/10">
              {event.name}
            </h1>
            <Badge variant={event.applicationsOpen ? "success" : "warning"}>
              {event.applicationsOpen ? t("header.applicationsOpen") : t("list.statusClosed")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground md:text-base">
            {termsSummary(event, t, "header")}
          </p>
        </div>
      ) : (
        // Keeps the tabs from jumping while the event loads.
        <div className="h-18" />
      )}
    </div>
  )
  return (
    <>
      <header className="flex min-w-0 flex-col gap-4">
        {isCompact || isProgram ? (
          heading
        ) : (
          <HeadingBand
            motif={
              matches(ROUTES.organizer.eventPayments)
                ? "finance"
                : !isHealth && matches(ROUTES.organizer.eventApplications)
                  ? "forms"
                  : "planning"
            }
          >
            {heading}
          </HeadingBand>
        )}
        {isCompact && <BrandDivider />}
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
      className="sticky top-14 z-20 bg-background md:static md:z-auto"
    >
      {/* Phone: sticks under the 56 px top bar and replaces the tabs. */}
      <div className="-mx-4 bg-background px-4 py-2 md:hidden">
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
            className="w-(--radix-dropdown-menu-trigger-width) overscroll-contain"
          >
            {SECTIONS.map(({ key, to, icon: Icon }, index) => (
              <DropdownMenuItem
                key={key}
                asChild
                className={cn("min-h-11 gap-3", index === activeIndex && "bg-accent font-medium")}
              >
                <Link
                  to={to}
                  params={params}
                  aria-current={index === activeIndex ? "page" : undefined}
                >
                  <Icon aria-hidden />
                  {t(`eventTabs.${key}`)}
                  {index === activeIndex ? (
                    <Check
                      className="ml-auto"
                      aria-hidden="true"
                    />
                  ) : null}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="hidden min-w-0 gap-4 overflow-x-auto p-1 md:flex">
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
