import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { formatDate } from "@/lib/date"

import { ApplicationsPage } from "@/features/event-overview/components/ApplicationsPage"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get } }))
const application = {
  id: "a1",
  firstName: "Jana",
  lastName: "Test",
  birthDate: "2000-01-01",
  gender: "FEMALE",
  email: "jana@example.com",
  submittedAt: "2027-01-01T12:00:00Z",
  amountDueCzk: 1000,
  amountPaidCzk: 400,
  amountOwedCzk: 600,
  paymentStatus: "PARTIALLY_PAID",
  terms: [
    {
      id: "t1",
      name: "First",
      startsOn: "2027-07-12",
      endsOn: "2027-07-18",
      status: "CONFIRMED",
      priceCzk: 1000,
    },
    {
      id: "t2",
      name: "Second",
      startsOn: "2027-07-19",
      endsOn: "2027-07-25",
      status: "WAITLISTED",
      priceCzk: 1000,
    },
  ],
}
function setup(rows: unknown = [application], isError = false) {
  get.mockImplementation((path: string) => ({
    json: () =>
      path.endsWith("occupancy")
        ? Promise.resolve({ eventId: "e1", roomMode: "GENDERED", roomCount: 1, terms: [] })
        : isError
          ? Promise.reject(new Error("Failed"))
          : Promise.resolve(rows),
  }))
  const onFiltersChange = vi.fn()
  const root = createRootRoute({
    component: () => (
      <ApplicationsPage
        eventId="e1"
        filters={{ term: "t1", status: "CONFIRMED", paid: "false", gender: "FEMALE" }}
        onFiltersChange={onFiltersChange}
      />
    ),
  })
  const route = createRoute({ getParentRoute: () => root, path: "/" })
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return onFiltersChange
}
beforeEach(() => vi.clearAllMocks())
describe("ApplicationsPage", () => {
  it("passes combined filters, displays all terms and links to payment", async () => {
    setup()
    expect(await screen.findAllByText("jana@example.com", { exact: false })).toHaveLength(2)
    expect(screen.getAllByText("Waitlisted").length).toBeGreaterThan(0)
    expect(screen.getByRole("link", { name: "Record payment" })).toHaveAttribute(
      "href",
      "/organizer/events/e1/applications/a1",
    )
    const request = get.mock.calls.find(([path]) => String(path).endsWith("applications"))!
    expect(String((request[1] as { searchParams: URLSearchParams }).searchParams)).toBe(
      "termId=t1&status=CONFIRMED&gender=FEMALE&paid=false",
    )
  })
  it("keeps identifying and contact details in mobile cards for same-name participants", async () => {
    setup([
      application,
      {
        ...application,
        id: "a2",
        birthDate: "2001-02-03",
        gender: "MALE",
        email: "other@example.com",
      },
    ])
    const first = await screen.findByRole("link", { name: /Jana Test.*jana@example.com/ })
    expect(first).toHaveTextContent(formatDate("2000-01-01"))
    expect(first).toHaveTextContent("woman")
    expect(first).toHaveAttribute("href", "/organizer/events/e1/applications/a1")
    const second = screen.getByRole("link", { name: /Jana Test.*other@example.com/ })
    expect(second).toHaveTextContent(formatDate("2001-02-03"))
    expect(second).toHaveTextContent("man")
    expect(second).toHaveAttribute("href", "/organizer/events/e1/applications/a2")
  })
  it("clears every filter including the gender from occupancy links", async () => {
    const change = setup([])
    expect(
      await screen.findByText("No applications match the selected filters."),
    ).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole("button", { name: "Clear filters" }))
    expect(change).toHaveBeenCalledWith({})
  })
  it("offers retry after a failed request", async () => {
    setup([], true)
    expect(await screen.findByText("Could not load applications")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument()
  })
})
