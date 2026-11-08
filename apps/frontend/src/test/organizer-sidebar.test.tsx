import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { cleanup, render, screen } from "@testing-library/react"
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

describe("organizer sidebar", () => {
  it.each(["/organizer/events", "/organizer/events/e1", "/organizer/events/e1/applications"])(
    "highlights exactly one item, Events, on %s",
    async (entry) => {
      renderAt(entry)
      const links = await screen.findAllByRole("link", { name: /^Events$/ })
      const active = links.filter((link) => link.getAttribute("data-status") === "active")
      expect(active.map((link) => link.textContent)).toEqual(["Events"])
      expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument()
      // "Overview" is left out for now (#394).
      expect(screen.queryByRole("link", { name: "Overview" })).not.toBeInTheDocument()
    },
  )
})
