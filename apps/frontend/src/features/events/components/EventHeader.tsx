import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowLeft, ChevronDown, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BrandDivider } from "@/components/atoms/BrandDivider"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

import { eventQueryOptions } from "@/features/events/api/events"
import { EventSectionLinks } from "@/features/events/components/EventSectionLinks"
import { EventStatusBadge } from "@/features/events/components/EventStatusBadge"
import { useCurrentEventSection } from "@/features/events/lib/event-sections"
import { termsSummary } from "@/features/events/lib/terms-summary"

/**
 * Head of every event page, the same on all sections: the event name with whether the application is
 * open, „organization · dates“ and the orange BrandDivider (no band, no
 * illustration). From `lg` the sections are in the contextual sidebar (EventSidebarNav); below it one
 * button with the current section sticks under the 56 px header and opens a bottom sheet with all of
 * them, so any section is two taps away. The way back to all events is the sidebar's first item
 * from `lg`; below it a quiet text link above the name (not the round back control, which stays for
 * the sub-pages' „Zpět na …“, so a phone never shows two circles stacked).
 */
// Figma (Design system v2): F5 / Přehled akce · záhlaví · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15398-536 (mobile 15398-598)
// Figma (Design system v2): Navigace A / Spodní panel sekcí akce · Mobil · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=18359-20490 (component 27892-4897)
export function EventHeader({ eventId }: { eventId: string }) {
  const { t } = useTranslation("events")
  const { data: event } = useQuery(eventQueryOptions(eventId))

  return (
    <>
      <header className="flex min-w-0 flex-col gap-3">
        <Link
          to={ROUTES.organizer.events}
          className="-my-3 inline-flex min-h-11 items-center gap-1.5 self-start rounded-control text-sm text-muted-foreground transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
        >
          <ArrowLeft
            aria-hidden
            className="size-4"
          />
          {t("header.allEvents")}
        </Link>
        <div className="flex items-start">
          {event ? (
            <div className="flex min-w-0 flex-col gap-2 wrap-anywhere md:gap-1">
              <div className="flex flex-col items-start gap-2 md:flex-row md:flex-wrap md:items-center md:gap-x-3">
                <h1 className="min-w-0 text-2xl font-bold tracking-tight md:text-[32px]/10">
                  {event.name}
                </h1>
                <EventStatusBadge isOpen={event.applicationsOpen} />
              </div>
              <p className="text-sm text-muted-foreground">
                {event.organizationName} · {termsSummary(event, t)}
              </p>
            </div>
          ) : (
            // Keeps the section switcher from jumping while the event loads.
            <div className="h-18" />
          )}
        </div>
        <BrandDivider />
      </header>
      <EventSectionSwitcher eventId={eventId} />
    </>
  )
}

/** Below `lg`: the current section, and a bottom sheet with every section in its group. */
function EventSectionSwitcher({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const current = useCurrentEventSection(eventId)
  const CurrentIcon = current.icon

  return (
    <nav
      aria-label={t("nav.eventSections")}
      // Its 8 px padding (room under the header when stuck) is taken out of the page's 16 px gaps.
      className="sticky top-14 z-20 -mx-4 -my-2 bg-background px-4 py-2 md:-mx-8 md:px-8 lg:hidden"
    >
      <Sheet
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="lg"
            className="w-full justify-start gap-3 px-4 font-semibold data-[state=open]:bg-wash"
          >
            <CurrentIcon
              aria-hidden
              className="size-5"
            />
            {t(`eventTabs.${current.key}`)}
            <ChevronDown
              aria-hidden
              className="ml-auto size-5"
            />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          aria-describedby={undefined}
          className="max-h-[85dvh] gap-4 overflow-y-auto rounded-t-xl border-x-0 px-4 pt-4 pb-6"
        >
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-lg">{t("nav.eventSectionsTitle")}</SheetTitle>
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={t("nav.closeEventSections")}
              >
                <X
                  aria-hidden
                  className="size-5"
                />
              </Button>
            </SheetClose>
          </div>
          <EventSectionLinks
            eventId={eventId}
            size="touch"
            onNavigate={() => setIsOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </nav>
  )
}
