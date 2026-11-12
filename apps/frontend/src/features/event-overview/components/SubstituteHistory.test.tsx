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
  confirmed: { applicationId: "a3", name: "Petr Svoboda", status: "CONFIRMED" },
  skipped: [
    { applicationId: "a1", name: "Adam Dvořák", status: "WAITLISTED" },
    { applicationId: "a2", name: "Jan Novák", status: "WAITLISTED" },
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
  it("shows who was confirmed, when, by whom and who was skipped", async () => {
    respond([record()])
    renderWithRouter(
      <SubstituteHistory
        eventId="e1"
        term={term}
      />,
    )
    const section = await screen.findByRole("region", { name: "Filled beds history" })
    expect(within(section).getByText("Petr Svoboda")).toBeInTheDocument()
    expect(within(section).getByText(/ · Eva Malá$/)).toBeInTheDocument()
    expect(within(section).getByText("Skipped: Adam Dvořák, Jan Novák")).toBeInTheDocument()
    expect(
      within(section).getByRole("link", { name: "Open detail: Petr Svoboda" }),
    ).toHaveAttribute("href", "/organizer/events/e1/applications/a3")
  })

  it("names a system action and leaves the skipped line out when nobody was skipped", async () => {
    respond([record({ skipped: [], changedByName: null })])
    renderWithRouter(
      <SubstituteHistory
        eventId="e1"
        term={term}
      />,
    )
    expect(await screen.findByText(/ · System$/)).toBeInTheDocument()
    expect(screen.queryByText(/Skipped:/)).toBeNull()
  })

  it("keeps the entry but drops the skipped line once the confirmed one is a substitute again", async () => {
    respond([
      record({ confirmed: { applicationId: "a3", name: "Petr Svoboda", status: "WAITLISTED" } }),
    ])
    renderWithRouter(
      <SubstituteHistory
        eventId="e1"
        term={term}
      />,
    )
    expect(await screen.findByText("Petr Svoboda")).toBeInTheDocument()
    expect(screen.queryByText(/Skipped:/)).toBeNull()
  })

  it("lists only the skipped ones that still wait", async () => {
    respond([
      record({
        skipped: [
          { applicationId: "a1", name: "Adam Dvořák", status: "CANCELLED" },
          { applicationId: "a2", name: "Jan Novák", status: "WAITLISTED" },
        ],
      }),
    ])
    renderWithRouter(
      <SubstituteHistory
        eventId="e1"
        term={term}
      />,
    )
    expect(await screen.findByText("Skipped: Jan Novák")).toBeInTheDocument()
  })

  it("lists a person confirmed twice once", async () => {
    respond([record({ id: "old", changedAt: "2027-03-10T09:00:00Z" }), record()])
    renderWithRouter(
      <SubstituteHistory
        eventId="e1"
        term={term}
      />,
    )
    await screen.findByRole("region", { name: "Filled beds history" })
    expect(screen.getAllByText("Petr Svoboda")).toHaveLength(1)
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
    owedCzk: 0,
    capacity: 50,
    occupied: 48,
    debtCzk: 0,
    confirmationExceedsCapacity: false,
    confirmationNextOccupied: 49,
    confirmationCapacity: 25,
    confirmationOccupied: 24,
    confirmationDueCzk: 6900,
    allowedStatuses: [],
    history: [],
    substituteRecords,
  })

  it("shows who confirmed the one that passed this application over", async () => {
    respond([termWith([record()])])
    renderWithRouter(<ApplicationSubstituteRecords applicationId="a1" />)
    expect(await screen.findByText("Skipped by confirming a substitute")).toBeInTheDocument()
    expect(screen.getByText(/^Petr Svoboda · /)).toBeInTheDocument()
  })

  it("lists the skipped substitutes on the confirmed application", async () => {
    respond([termWith([record()])])
    renderWithRouter(<ApplicationSubstituteRecords applicationId="a3" />)
    expect(await screen.findByText("Skipped substitutes")).toBeInTheDocument()
    expect(screen.getByText(/^Adam Dvořák · \d/)).toBeInTheDocument()
    expect(screen.getByText(/^Jan Novák · \d/)).toBeInTheDocument()
  })

  it("shows a person confirmed twice once, with the newest record", async () => {
    respond([
      termWith([
        record({ id: "old", changedAt: "2027-03-10T09:00:00Z" }),
        record({
          id: "new",
          changedAt: "2027-03-11T09:00:00Z",
          skipped: [{ applicationId: "a2", name: "Jan Novák", status: "WAITLISTED" }],
        }),
      ]),
    ])
    renderWithRouter(<ApplicationSubstituteRecords applicationId="a3" />)
    expect(await screen.findAllByText("Skipped substitute")).toHaveLength(1)
    expect(screen.queryByText(/Adam Dvořák/)).toBeNull()
  })

  it("shows nothing once the confirmed one is no longer confirmed", async () => {
    const cancelled = { applicationId: "a3", name: "Petr Svoboda", status: "CANCELLED" }
    respond([termWith([record({ confirmed: cancelled })])])
    renderWithRouter(<ApplicationSubstituteRecords applicationId="a1" />)
    await vi.waitFor(() => expect(get).toHaveBeenCalled())
    expect(screen.queryByText(/Skipped/)).toBeNull()
  })

  it("shows nothing on an application that is no longer waiting", async () => {
    respond([
      termWith([
        record({ skipped: [{ applicationId: "a1", name: "Adam Dvořák", status: "CANCELLED" }] }),
      ]),
    ])
    renderWithRouter(<ApplicationSubstituteRecords applicationId="a1" />)
    await vi.waitFor(() => expect(get).toHaveBeenCalled())
    expect(screen.queryByText(/Skipped/)).toBeNull()
  })

  it("shows nothing for a confirmation that skipped nobody", async () => {
    respond([termWith([record({ skipped: [] })])])
    renderWithRouter(<ApplicationSubstituteRecords applicationId="a3" />)
    await vi.waitFor(() => expect(get).toHaveBeenCalled())
    expect(screen.queryByText(/Skipped/)).toBeNull()
  })

  it("shows nothing when the application has no record", async () => {
    respond([termWith([])])
    renderWithRouter(<ApplicationSubstituteRecords applicationId="a1" />)
    await vi.waitFor(() => expect(get).toHaveBeenCalled())
    expect(screen.queryByText(/Skipped/)).toBeNull()
  })
})
