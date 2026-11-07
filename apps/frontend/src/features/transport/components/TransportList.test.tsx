import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { TransportList } from "@/features/transport/components/TransportList"

const listing = {
  eventName: "Letní kemp",
  eventLocation: "Areál Lipno",
  ownCount: 2,
  transports: [
    {
      id: "t1",
      name: "Autobus z Prahy",
      departurePlace: "Praha, Černý Most",
      departureAt: "2027-07-12T06:00:00.000Z",
      participantsCount: 24,
    },
  ],
}

function renderList() {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(listing), { headers: { "Content-Type": "application/json" } }),
  )
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <TransportList eventId="e1" />,
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe("TransportList", () => {
  it("shows each transport with its place and participants, and own transport", async () => {
    renderList()

    expect(await screen.findByRole("heading", { name: "Autobus z Prahy" })).toBeInTheDocument()
    expect(screen.getByText("Praha, Černý Most")).toBeInTheDocument()
    expect(screen.getByText("Registered participants · 24")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Own transport" })).toBeInTheDocument()
    expect(screen.getByText("Areál Lipno")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Add transport" })).toBeInTheDocument()
  })
})
