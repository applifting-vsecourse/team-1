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
  name: "Letní kemp Lipno 2027",
  description: null,
  location: null,
  publicToken: "tok123",
  createdAt: "2027-01-01T10:00:00.000Z",
  termCount: 0,
  roomCount: 0,
  startsOn: null,
  endsOn: null,
  applicationsOpen: true,
  missing: [],
  terms: [],
}

function renderHeader(path: string) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(event), { headers: { "Content-Type": "application/json" } }),
  )
  const root = createRootRoute({ component: () => <EventHeader eventId="e1" /> })
  const paths = ["/organizer/events/$eventId", "/organizer/events/$eventId/capacity"]
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
}

afterEach(() => vi.restoreAllMocks())

describe("EventHeader sections", () => {
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
      "Capacity",
      "Accommodation",
      "Terms",
    ])
    expect(items[0]).toHaveAttribute("aria-current", "page")
    expect(items[2]).toHaveAttribute("href", "/organizer/events/e1/capacity")
  })
})
