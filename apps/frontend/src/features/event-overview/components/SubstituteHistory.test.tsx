import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApplicationSubstituteRecords } from "@/features/event-overview/components/ApplicationSubstituteRecords"
import { SubstituteHistory } from "@/features/event-overview/components/SubstituteHistory"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get } }))

const record = (overrides: object = {}) => ({
  id: "c1",
  termId: "t1",
  group: "MALE",
  confirmed: { applicationId: "a3", name: "Petr Svoboda" },
  skipped: [
    { applicationId: "a1", name: "Adam Dvořák" },
    { applicationId: "a2", name: "Jan Novák" },
  ],
  changedByName: "Eva Malá",
  changedAt: "2027-03-11T09:32:00Z",
  ...overrides,
})
const term = { id: "t1", startsOn: "2027-07-12", endsOn: "2027-07-18" }

function renderWithRouter(element: React.ReactNode) {
  const root = createRootRoute({ component: () => element })
  const router = createRouter({
    routeTree: root.addChildren([createRoute({ getParentRoute: () => root, path: "/" })]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}
const respond = (data: unknown) => get.mockReturnValue({ json: () => Promise.resolve(data) })

beforeEach(() => vi.clearAllMocks())

describe("history of filled beds at the waitlist (US-105)", () => {
  it("shows who was confirmed, who was skipped, who did it, the term and the group", async () => {
    respond([record()])
    renderWithRouter(
      <SubstituteHistory
        eventId="e1"
        term={term}
      />,
    )
    const section = await screen.findByRole("region", { name: "Filled beds history" })
    expect(within(section).getByText("Substitute confirmation")).toBeInTheDocument()
    expect(within(section).getByText(/^Eva Malá · /)).toBeInTheDocument()
    expect(within(section).getByText("Petr Svoboda")).toBeInTheDocument()
    expect(within(section).getByText("Substitute → Participation confirmed")).toBeInTheDocument()
    expect(within(section).getByText("Skipped substitutes")).toBeInTheDocument()
    expect(
      within(section).getByText("Adam Dvořák, Jan Novák · stay substitutes"),
    ).toBeInTheDocument()
    expect(within(section).getByText(/12–18 Jul 2027 · men's beds/)).toBeInTheDocument()
    expect(
      within(section).getByText("Record created automatically on confirmation."),
    ).toBeInTheDocument()
    expect(
      within(section).getByRole("link", { name: "Open detail: Petr Svoboda" }),
    ).toHaveAttribute("href", "/organizer/events/e1/applications/a3")
  })

  it("names a system action and leaves the skipped row out when nobody was skipped", async () => {
    respond([record({ skipped: [], changedByName: null, group: "SHARED" })])
    renderWithRouter(
      <SubstituteHistory
        eventId="e1"
        term={term}
      />,
    )
    expect(await screen.findByText(/^System · /)).toBeInTheDocument()
    expect(screen.queryByText(/Skipped substitute/)).toBeNull()
    expect(screen.getByText(/shared beds/)).toBeInTheDocument()
  })

  it("shows nothing without a record", async () => {
    respond([])
    renderWithRouter(
      <SubstituteHistory
        eventId="e1"
        term={term}
      />,
    )
    await vi.waitFor(() => expect(get).toHaveBeenCalled())
    expect(screen.queryByRole("region")).toBeNull()
    expect(screen.queryByText("Substitute confirmation")).toBeNull()
  })

  it("renders the whole record on a 360 px wide screen", async () => {
    const width = window.innerWidth
    window.innerWidth = 360
    window.dispatchEvent(new Event("resize"))
    respond([record()])
    renderWithRouter(
      <SubstituteHistory
        eventId="e1"
        term={term}
      />,
    )
    const section = await screen.findByRole("region", { name: "Filled beds history" })
    // One column of labelled values, no table that would need horizontal scrolling.
    expect(within(section).queryByRole("table")).toBeNull()
    expect(within(section).getAllByText(/./).length).toBeGreaterThan(8)
    window.innerWidth = width
  })
})

describe("record in the detail of an application (US-105)", () => {
  const termWith = (substituteRecords: unknown[]) => ({
    termId: "t1",
    name: "T1",
    startsOn: "2027-07-12",
    endsOn: "2027-07-18",
    status: "WAITLISTED",
    priceCzk: 6900,
    allowedStatuses: [],
    history: [],
    substituteRecords,
  })

  it("shows the record where the application was skipped", async () => {
    respond([termWith([record()])])
    renderWithRouter(<ApplicationSubstituteRecords applicationId="a1" />)
    expect(await screen.findByText("Substitute confirmation")).toBeInTheDocument()
    expect(screen.getByText("Petr Svoboda")).toBeInTheDocument()
    expect(screen.getByText(/Adam Dvořák, Jan Novák/)).toBeInTheDocument()
  })

  it("shows nothing when the application has no record", async () => {
    respond([termWith([])])
    renderWithRouter(<ApplicationSubstituteRecords applicationId="a1" />)
    await vi.waitFor(() => expect(get).toHaveBeenCalled())
    expect(screen.queryByText("Substitute confirmation")).toBeNull()
  })
})
