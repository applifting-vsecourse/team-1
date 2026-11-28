import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { EventSidebarNav } from "@/features/events/components/EventSidebarNav"

const event = {
  id: "e1",
  organizationId: "o1",
  organizationName: "Kemp Lipno",
  organizationContactEmail: null,
  name: "Letní kemp Lipno 2027",
  description: null,
  location: null,
  contactEmail: null,
  contactPhone: null,
  publishedInCatalog: false,
  photoFileName: null,
  publicToken: "tok123",
  createdAt: "2027-01-01T10:00:00.000Z",
  termCount: 0,
  startsOn: null,
  endsOn: null,
  applicationsOpen: true,
  evaluationMode: "AUTOMATIC",
  evaluationModePending: false,
  cancellationStartsOn: null,
  cancellationTerms: null,
  evaluationModeLocked: true,
  hasApplications: false,
  missing: [],
  terms: [],
}

function renderSidebar(path: string) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(event), { headers: { "Content-Type": "application/json" } }),
  )
  const root = createRootRoute({ component: () => <EventSidebarNav eventId="e1" /> })
  const paths = [
    "/organizer/events",
    "/organizer/events/$eventId",
    "/organizer/events/$eventId/applications",
    "/organizer/events/$eventId/applications/$applicationId",
  ]
  const router = createRouter({
    routeTree: root.addChildren(
      paths.map((routePath) => createRoute({ getParentRoute: () => root, path: routePath })),
    ),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

// Navigation A (Figma 27890:4721): inside an event the sidebar holds the way back, the event and its sections.
describe("EventSidebarNav", () => {
  it("leads back to all events without marking them as the current page", async () => {
    renderSidebar("/organizer/events/e1")

    const back = await screen.findByRole("link", { name: "All events" })
    expect(back).toHaveAttribute("href", "/organizer/events")
    expect(back).not.toHaveAttribute("aria-current")
  })

  it("names the event with whether its application is open", async () => {
    renderSidebar("/organizer/events/e1")

    expect(await screen.findByText("Letní kemp Lipno 2027")).toBeInTheDocument()
    expect(screen.getByText("Applications open")).toBeInTheDocument()
  })

  it("lists the sections in their groups and keeps the section marked on its sub-pages", async () => {
    renderSidebar("/organizer/events/e1/applications/a1")

    const nav = await screen.findByRole("navigation", { name: "Event sections" })
    expect(within(nav).getAllByRole("list")).toHaveLength(4)
    expect(within(nav).getAllByRole("link")).toHaveLength(11)
    const applications = within(nav).getByRole("link", { name: "Applications" })
    await vi.waitFor(() => expect(applications).toHaveAttribute("aria-current", "page"))
    expect(applications).toHaveClass("min-h-10", "text-sm")
    expect(within(nav).getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current")
  })
})
