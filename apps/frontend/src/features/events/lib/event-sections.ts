import { useMatchRoute } from "@tanstack/react-router"
import {
  BedDouble,
  Bus,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Gauge,
  LayoutGrid,
  Megaphone,
  Settings,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import { ROUTES } from "@/app/routes"

const SECTION_ROUTES = {
  overview: ROUTES.organizer.event,
  applications: ROUTES.organizer.eventApplications,
  payments: ROUTES.organizer.eventPayments,
  capacity: ROUTES.organizer.eventCapacity,
  meals: ROUTES.organizer.eventMeals,
  rooms: ROUTES.organizer.eventRooms,
  terms: ROUTES.organizer.eventTerms,
  transport: ROUTES.organizer.eventTransport,
  program: ROUTES.organizer.eventProgram,
  board: ROUTES.organizer.eventBoard,
  settings: ROUTES.organizer.eventSettings,
} as const

type SectionKey = keyof typeof SECTION_ROUTES

export type EventSection = {
  key: SectionKey
  to: (typeof SECTION_ROUTES)[SectionKey]
  icon: LucideIcon
  /** Only the overview is matched exactly; every other section stays current on its sub-pages. */
  isExact?: true
}

const section = (key: SectionKey, icon: LucideIcon, isExact?: true): EventSection => ({
  key,
  to: SECTION_ROUTES[key],
  icon,
  isExact,
})

/**
 * The sections of an open event in their groups (navigation A, Figma 27890:4884): the event's
 * work, its logistics, its communication and its settings. The contextual sidebar and the phone's
 * bottom sheet both render these, so the two never differ.
 */
export const EVENT_SECTION_GROUPS: EventSection[][] = [
  [
    section("overview", LayoutGrid, true),
    section("applications", ClipboardList),
    section("payments", Wallet),
  ],
  [
    section("capacity", Gauge),
    section("meals", Utensils),
    section("rooms", BedDouble),
    section("terms", CalendarDays),
    section("transport", Bus),
  ],
  [section("program", CalendarClock), section("board", Megaphone)],
  [section("settings", Settings)],
]

/** The section the current page belongs to; the overview when none matches. */
export function useCurrentEventSection(eventId: string): EventSection {
  const matchRoute = useMatchRoute()
  const sections = EVENT_SECTION_GROUPS.flat()
  return (
    sections.find((item) =>
      matchRoute({ to: item.to, params: { eventId }, fuzzy: !item.isExact }),
    ) ?? sections[0]!
  )
}
