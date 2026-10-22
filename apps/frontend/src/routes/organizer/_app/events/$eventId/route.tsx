import { createFileRoute, Outlet } from "@tanstack/react-router"

// Event detail: each section is its own route file so streams A (terms, rooms)
// and D (overview, applications) never edit the same page. The sections are
// in the sidebar (EventSidebarNav), rendered by the organizer layout.
export const Route = createFileRoute("/organizer/_app/events/$eventId")({
  component: Outlet,
})
