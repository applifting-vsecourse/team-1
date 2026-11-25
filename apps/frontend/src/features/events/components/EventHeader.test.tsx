import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { EventHeader } from "@/features/events/components/EventHeader"

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

function renderHeader(path: string) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(event), { headers: { "Content-Type": "application/json" } }),
  )
  const root = createRootRoute({ component: () => <EventHeader eventId="e1" /> })
  const paths = [
    "/organizer/events",
    "/organizer/events/$eventId",
    "/organizer/events/$eventId/capacity",
  ]
  const routes = paths.map((routePath) =>
    createRoute({ getParentRoute: () => root, path: routePath }),
  )
  const router = createRouter({
    routeTree: root.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

afterEach(() => vi.restoreAllMocks())

describe("EventHeader sections", () => {
  it("labels the icon on focus and returns to the event list with Enter", async () => {
    const user = userEvent.setup()
    const router = renderHeader("/organizer/events/e1/capacity")
    const back = await screen.findByRole("link", { name: "All events" })

    await user.tab()
    expect(back).toHaveFocus()
    expect(await screen.findByRole("tooltip")).toHaveTextContent("All events")
    await user.keyboard("{Enter}")
    await vi.waitFor(() => expect(router.state.location.pathname).toBe("/organizer/events"))
  })

  it("shows only the current section on a phone", async () => {
    renderHeader("/organizer/events/e1/capacity")

    const trigger = await screen.findByRole("button", { name: /Capacity/ })
    expect(trigger).toHaveTextContent(/^Capacity$/)
  })

  it("opens a menu with every section and marks the current one", async () => {
    renderHeader("/organizer/events/e1")
    await userEvent.click(await screen.findByRole("button", { name: /Overview/ }))

    const menu = await screen.findByRole("menu")
    const items = within(menu).getAllByRole("menuitem")
    expect(items.map((item) => item.textContent)).toEqual([
      "Overview",
      "Applications",
      "Payments",
      "Capacity",
      "Meals",
      "Accommodation",
      "Terms",
      "Transport",
      "Program",
      "Board",
      "Settings",
    ])
    expect(items[0]).toHaveAttribute("aria-current", "page")
    expect(items[3]).toHaveAttribute("href", "/organizer/events/e1/capacity")

    await userEvent.click(items[3]!)
    expect(await screen.findByRole("button", { name: "Capacity" })).toBeVisible()
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })
})
