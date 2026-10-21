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

import { EventTerms } from "@/features/events/components/EventTerms"

const event = {
  id: "e1",
  organizationId: "o1",
  organizationName: "Kemp Lipno",
  name: "Letní kemp Lipno 2027",
  description: null,
  location: null,
  publicToken: "tok",
  createdAt: "2027-01-01T10:00:00.000Z",
  termCount: 2,
  roomCount: 1,
  startsOn: "2027-07-12",
  endsOn: "2027-08-08",
  applicationsOpen: true,
  missing: [],
  terms: [],
}
const term = (overrides: object) => ({
  id: "t1",
  eventId: "e1",
  name: "Letní turnus 1",
  startsOn: "2027-07-12",
  endsOn: "2027-07-18",
  priceCzk: 6900,
  capacity: 60,
  confirmedCount: 0,
  waitlistedCount: 0,
  cancelledAt: null,
  cancelReason: null,
  ...overrides,
})
const terms = [
  term({}),
  term({
    id: "t2",
    name: "Srpnový turnus",
    startsOn: "2027-08-02",
    endsOn: "2027-08-08",
    confirmedCount: 18,
    waitlistedCount: 1,
  }),
  term({ id: "t3", name: "Zrušený", cancelledAt: "2027-02-01T10:00:00.000Z", cancelReason: "x" }),
]

const sentBodies: unknown[] = []

function renderTerms() {
  sentBodies.length = 0
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const request = input as Request
    if (request.method === "POST") sentBodies.push(await request.clone().json())
    const isTerms = request.url.endsWith("/terms")
    const body = request.method === "POST" ? terms[0] : isTerms ? terms : event
    return Promise.resolve(
      new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } }),
    )
  })
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <EventTerms eventId="e1" />,
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
  return fetchMock
}

const posts = (fetchMock: ReturnType<typeof renderTerms>) =>
  fetchMock.mock.calls.filter(([request]) => (request as Request).method === "POST")

afterEach(() => vi.restoreAllMocks())

describe("EventTerms", () => {
  it("lists active terms with period, price and occupancy, and the cancelled ones apart", async () => {
    renderTerms()

    expect(await screen.findByRole("heading", { name: "Event terms · 2" })).toBeInTheDocument()
    expect(screen.getByText("12–18 Jul 2027")).toBeInTheDocument()
    expect(screen.getByText(/^Letní turnus 1 · /)).toBeInTheDocument()
    expect(screen.getByText("0 / 60 places")).toBeInTheDocument()
    expect(screen.getByRole("progressbar", { name: "18 / 60 places" })).toBeInTheDocument()
    expect(screen.getByText("Cancelled term")).toBeInTheDocument()
    expect(screen.getByText("Zrušený · 12–18 Jul 2027 · Cancelled")).toBeInTheDocument()
  })

  it("shows the error and sends nothing when the end is before the start", async () => {
    const fetchMock = renderTerms()
    await userEvent.click(await screen.findByRole("button", { name: "Add term" }))
    const dialog = await screen.findByRole("dialog")

    await userEvent.type(within(dialog).getByLabelText("Term name *"), "Letní turnus 3")
    await userEvent.type(within(dialog).getByLabelText("Start date *"), "2027-08-09")
    await userEvent.type(within(dialog).getByLabelText("End date *"), "2027-08-08")
    await userEvent.type(within(dialog).getByLabelText("Price per person (CZK) *"), "7600")
    await userEvent.click(within(dialog).getByRole("button", { name: "Add term" }))

    expect(await within(dialog).findByText("The end must be after the start.")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("End date *")).toHaveAttribute("aria-invalid", "true")
    expect(posts(fetchMock)).toHaveLength(0)
  })

  it("adds a term and confirms it", async () => {
    const fetchMock = renderTerms()
    await userEvent.click(await screen.findByRole("button", { name: "Add term" }))
    const dialog = await screen.findByRole("dialog")

    await userEvent.type(within(dialog).getByLabelText("Term name *"), "Letní turnus 1")
    await userEvent.type(within(dialog).getByLabelText("Start date *"), "2027-07-12")
    await userEvent.type(within(dialog).getByLabelText("End date *"), "2027-07-18")
    await userEvent.type(within(dialog).getByLabelText("Price per person (CZK) *"), "6900")
    await userEvent.click(within(dialog).getByRole("button", { name: "Add term" }))

    expect(await screen.findByText("The term Letní turnus 1 was added.")).toBeInTheDocument()
    expect(posts(fetchMock)).toHaveLength(1)
    expect(sentBodies[0]).toEqual({
      name: "Letní turnus 1",
      startsOn: "2027-07-12",
      endsOn: "2027-07-18",
      priceCzk: 6900,
    })
  })

  it("asks for a reason and shows what the cancellation affects", async () => {
    const fetchMock = renderTerms()
    const row = (await screen.findByText(/^Srpnový turnus · /)).closest("li") as HTMLElement
    await userEvent.click(within(row).getByRole("button", { name: "Cancel term" }))
    const dialog = await screen.findByRole("dialog")

    expect(
      within(dialog).getByText("18 confirmed applications and 1 waitlisted"),
    ).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirm cancellation" }))

    expect(await within(dialog).findByText("Fill in this field.")).toBeInTheDocument()
    expect(posts(fetchMock)).toHaveLength(0)
  })
})
