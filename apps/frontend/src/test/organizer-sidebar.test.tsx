import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { Route } from "@/routes/organizer/_app"

vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }))
vi.mock("@/features/auth/components/SidebarAccount", () => ({ SidebarAccount: () => null }))
vi.mock("@/lib/api-client", () => ({
  api: { get: () => ({ json: () => Promise.resolve({ count: 0 }) }) },
}))

// The real organizer layout over a tree with the same paths as the app (#394).
function renderAt(entry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const root = createRootRouteWithContext<{ queryClient: QueryClient }>()()
  const organizer = createRoute({ getParentRoute: () => root, path: "/organizer" })
  const app = createRoute({
    getParentRoute: () => organizer,
    id: "_app",
    component: Route.options.component,
  })
  const home = createRoute({ getParentRoute: () => app, path: "/" })
  const events = createRoute({ getParentRoute: () => app, path: "/events" })
  const eventsList = createRoute({ getParentRoute: () => events, path: "/" })
  const event = createRoute({ getParentRoute: () => events, path: "/$eventId" })
  const overview = createRoute({ getParentRoute: () => event, path: "/" })
  const applications = createRoute({ getParentRoute: () => event, path: "/applications" })
  const router = createRouter({
    routeTree: root.addChildren([
      organizer.addChildren([
        app.addChildren([
          home,
          events.addChildren([eventsList, event.addChildren([overview, applications])]),
        ]),
      ]),
    ]),
    history: createMemoryHistory({ initialEntries: [entry] }),
    context: { queryClient },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

afterEach(() => cleanup())

// Sidebar items carry the nav A bar; the logo link (to the area's home) is not one of them.
const activeItems = (sidebar: HTMLElement) =>
  within(sidebar)
    .getAllByRole("link")
    .filter(
      (link) =>
        link.getAttribute("data-status") === "active" &&
        link.querySelector('[data-slot="nav-indicator"]'),
    )
    .map((link) => link.textContent)

describe("organizer sidebar", () => {
  it("highlights exactly one item, Events, on the events list", async () => {
    renderAt("/organizer/events")
    const sidebar = await screen.findByRole("complementary")
    await within(sidebar).findByRole("link", { name: "Events" })
    expect(activeItems(sidebar)).toEqual(["Events"])
    // Figma F5: the bell sits next to the logo in the sidebar (and in the phone header).
    expect(within(sidebar).getByRole("button", { name: "Notifications" })).toBeInTheDocument()
    expect(within(sidebar).queryByRole("navigation", { name: "Event sections" })).toBeNull()
  })

  // Navigation A (Figma 27890:4721): inside an event the sidebar switches to the event's sections.
  it.each([
    ["/organizer/events/e1", "Overview"],
    ["/organizer/events/e1/applications", "Applications"],
  ])("inside an event on %s marks only the current section, %s", async (entry, current) => {
    renderAt(entry)
    const sidebar = await screen.findByRole("complementary")
    const sections = await within(sidebar).findByRole("navigation", { name: "Event sections" })
    expect(activeItems(sidebar)).toEqual([current])
    expect(within(sections).getByRole("link", { name: current })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(within(sidebar).getByRole("link", { name: "All events" })).not.toHaveAttribute(
      "data-status",
    )
    expect(within(sidebar).queryByRole("link", { name: /^Events$/ })).toBeNull()
  })
})
