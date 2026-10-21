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

import { EventList } from "@/features/events/components/EventList"

const event = {
  id: "e1",
  organizationId: "o1",
  organizationName: "Kemp Lipno",
  name: "Letní kemp Lipno 2027",
  description: null,
  location: null,
  publicToken: "tok123",
  createdAt: "2027-01-01T10:00:00.000Z",
  termCount: 2,
  roomCount: 3,
  startsOn: "2027-07-12",
  endsOn: "2027-07-25",
  applicationsOpen: true,
  missing: [],
  terms: [
    {
      id: "t1",
      name: "Letní turnus 1",
      startsOn: "2027-07-12",
      endsOn: "2027-07-18",
      capacity: 60,
      confirmedCount: 48,
    },
    {
      id: "t2",
      name: "Letní turnus 2",
      startsOn: "2027-07-19",
      endsOn: "2027-07-25",
      capacity: 60,
      confirmedCount: 31,
    },
  ],
}

const draft = {
  ...event,
  id: "e2",
  name: "Jarní víkend Lipno 2027",
  termCount: 0,
  roomCount: 0,
  startsOn: null,
  endsOn: null,
  applicationsOpen: false,
  missing: ["TERM", "ROOM"],
  terms: [],
}

function renderList(events: object[], createdEventId?: string) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(events), { headers: { "Content-Type": "application/json" } }),
  )
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <EventList createdEventId={createdEventId} />,
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

describe("EventList", () => {
  it("shows each event as a card with its terms and their occupancy", async () => {
    renderList([event])

    const card = (await screen.findByRole("heading", { name: "Letní kemp Lipno 2027" })).closest(
      "a",
    ) as HTMLElement
    expect(within(card).getByText("Published")).toBeInTheDocument()
    expect(within(card).getByText("12–18 Jul 2027")).toBeInTheDocument()
    expect(within(card).getByText("Letní turnus 1")).toBeInTheDocument()
    expect(within(card).getByText("48 / 60 places")).toBeInTheDocument()
    expect(within(card).getByText("31 / 60 places")).toBeInTheDocument()
  })

  it("marks the event that was just created and says it has no term yet", async () => {
    renderList([event, draft], "e2")

    expect(
      await screen.findByText("The event Jarní víkend Lipno 2027 was created."),
    ).toHaveAttribute("role", "status")
    const item = screen.getByRole("heading", { name: "Jarní víkend Lipno 2027" }).closest("li")
    expect(item).toHaveAttribute("data-status", "active")
    expect(within(item as HTMLElement).getByText("No term yet")).toBeInTheDocument()
    expect(within(item as HTMLElement).getByText("Application inactive")).toBeInTheDocument()
  })
})
