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
  terms: [
    {
      termId: "term1",
      termName: "Letní týden",
      startsOn: "2027-07-12",
      endsOn: "2027-07-18",
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
    },
    {
      termId: "term2",
      termName: null,
      startsOn: "2027-07-19",
      endsOn: "2027-07-25",
      ownCount: 0,
      transports: [],
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
  it("groups transport by term, with own transport and an add button in each", async () => {
    renderList()

    expect(await screen.findByRole("heading", { name: "Letní týden" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Autobus z Prahy" })).toBeInTheDocument()
    expect(screen.getByText("Praha, Černý Most")).toBeInTheDocument()
    expect(screen.getByText("Registered participants · 24")).toBeInTheDocument()
    expect(screen.getAllByRole("heading", { name: "Own transport" })).toHaveLength(2)
    expect(screen.getAllByText("Areál Lipno")).toHaveLength(2)
    expect(screen.getAllByRole("link", { name: "Add transport" })).toHaveLength(2)
    expect(screen.getAllByRole("link", { name: "Add transport" })[1]).toHaveAttribute(
      "href",
      expect.stringContaining("termId=term2"),
    )
  })
})
