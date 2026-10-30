import { useState } from "react"
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
import { beforeEach, describe, expect, it, vi } from "vitest"

import { formatDate } from "@/lib/date"

import { ApplicationsPage } from "@/features/event-overview/components/ApplicationsPage"
import type { ApplicationsSearch } from "@/features/event-overview/lib/applications-search"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get } }))
// Radix Select scrolls and captures pointers using APIs absent from jsdom.
Element.prototype.hasPointerCapture = () => false
Element.prototype.scrollIntoView = vi.fn()
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
function setup(
  rows: unknown = [application],
  isError = false,
  q?: string,
  occupancy: { roomCount: number; terms: unknown[] } | null = null,
  initial?: ApplicationsSearch,
) {
  get.mockImplementation((path: string) => ({
    json: () =>
      path.endsWith("occupancy")
        ? Promise.resolve({
            eventId: "e1",
            roomMode: "GENDERED",
            roomCount: 1,
            ...occupancy,
            terms: occupancy?.terms ?? [
              {
                id: "t1",
                name: "First",
                startsOn: "2027-07-12",
                endsOn: "2027-07-18",
                capacity: 10,
                confirmed: 1,
                free: 9,
                waitlisted: 0,
                byGender: null,
              },
            ],
          })
        : isError
          ? Promise.reject(new Error("Failed"))
          : Promise.resolve(rows),
  }))
  const onFiltersChange = vi.fn()
  function Page() {
    const [filters, setFilters] = useState<ApplicationsSearch>(
      initial ?? {
        term: "t1",
        status: "CONFIRMED",
        payment: "UNPAID",
        gender: "FEMALE",
        ...(q ? { q } : {}),
      },
    )
    return (
      <ApplicationsPage
        eventId="e1"
        filters={filters}
        onFiltersChange={(next) => {
          onFiltersChange(next)
          setFilters(next)
        }}
      />
    )
  }
  const root = createRootRoute({
    component: Page,
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
  it("applies a mobile selection immediately and keeps it after closing the panel", async () => {
    const change = setup([application], false, "Jana")
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Filters · 4" }))
    const dialog = screen.getByRole("dialog", { name: "Filters" })
    await user.click(within(dialog).getByRole("combobox", { name: "Status in term" }))
    await user.click(screen.getByRole("option", { name: "Waitlisted" }))
    expect(change).toHaveBeenLastCalledWith({
      term: "t1",
      status: "WAITLISTED",
      payment: "UNPAID",
      gender: "FEMALE",
      q: "Jana",
    })
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(get).toHaveBeenLastCalledWith(
      expect.stringContaining("applications"),
      expect.objectContaining({
        searchParams: new URLSearchParams(
          "q=Jana&termId=t1&status=WAITLISTED&gender=FEMALE&payment=UNPAID",
        ),
      }),
    )
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(
      within(screen.getByRole("group", { name: "Active filters" })).getByRole("button", {
        name: "Remove filter: Waitlisted",
      }),
    ).toBeInTheDocument()
  })

  it("counts active filters and removes individual criteria while preserving the search", async () => {
    const change = setup([application], false, "Jana")
    const user = userEvent.setup()
    expect(await screen.findByRole("button", { name: "Filters · 4" })).toBeInTheDocument()
    const chips = screen.getByRole("group", { name: "Active filters" })
    await user.click(within(chips).getByRole("button", { name: "Remove filter: Confirmed" }))
    expect(change).toHaveBeenLastCalledWith({
      term: "t1",
      payment: "UNPAID",
      gender: "FEMALE",
      q: "Jana",
    })
    expect(screen.getByRole("button", { name: "Filters · 3" })).toBeInTheDocument()
    await user.click(within(chips).getByRole("button", { name: "Remove filter: woman" }))
    expect(change).toHaveBeenLastCalledWith({ term: "t1", payment: "UNPAID", q: "Jana" })
    expect(screen.getByRole("searchbox")).toHaveValue("Jana")
    expect(within(chips).getByRole("button", { name: /Remove filter:.*2027/ })).toBeInTheDocument()
  })

  it("opens the mobile panel, clears all criteria immediately and restores trigger focus on close", async () => {
    const change = setup([application], false, "Jana")
    const user = userEvent.setup()
    const trigger = await screen.findByRole("button", { name: "Filters · 4" })
    await user.click(trigger)
    const dialog = screen.getByRole("dialog", { name: "Filters" })
    expect(within(dialog).getAllByRole("combobox")).toHaveLength(3)
    await user.click(within(dialog).getByRole("button", { name: "Clear filters" }))
    expect(change).toHaveBeenLastCalledWith({})
    expect(within(dialog).getByRole("combobox", { name: "Status in term" })).toHaveTextContent(
      "All term statuses",
    )
    await user.click(within(dialog).getByRole("button", { name: "Show applications" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(trigger).toHaveTextContent(/^Filters$/)
    expect(trigger).toHaveFocus()
    expect(screen.queryByRole("group", { name: "Active filters" })).not.toBeInTheDocument()
    expect(screen.getByRole("searchbox")).toHaveValue("")
  })

  it("searches on every keystroke, preserves filters and clears the search with other filters", async () => {
    const change = setup()
    const input = await screen.findByRole("searchbox", { name: "Search applications" })
    const user = userEvent.setup()
    await user.type(input, "J")
    expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ q: "J" }))
    await user.type(input, "ana Test")
    expect(change).toHaveBeenLastCalledWith({
      term: "t1",
      status: "CONFIRMED",
      payment: "UNPAID",
      gender: "FEMALE",
      q: "Jana Test",
    })
    expect(get).toHaveBeenCalledWith(
      expect.stringContaining("applications"),
      expect.objectContaining({
        searchParams: new URLSearchParams(
          "q=Jana+Test&termId=t1&status=CONFIRMED&gender=FEMALE&payment=UNPAID",
        ),
      }),
    )
    expect(input).toHaveFocus()
    expect(screen.queryByRole("button", { name: "Search" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(change).toHaveBeenLastCalledWith({})
    expect(input).toHaveValue("")
  })
  it("restores a URL search and searches variable symbols with leading zeros immediately", async () => {
    const change = setup([application], false, "old query")
    const input = await screen.findByRole("searchbox", { name: "Search applications" })
    expect(input).toHaveValue("old query")
    const user = userEvent.setup()
    await user.clear(input)
    await user.type(input, "0048")
    expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ q: "0048" }))
    await user.clear(input)
    expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ q: undefined }))
  })
  it("starts at the first page of search results", async () => {
    setup(Array.from({ length: 21 }, (_, index) => ({ ...application, id: `a${index}` })))
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Next →" }))
    expect(screen.getByText("Showing 21–21 of 21 applications")).toBeInTheDocument()
    await user.type(screen.getByRole("searchbox"), "jana")
    expect(await screen.findByText("Showing 1–20 of 21 applications")).toBeInTheDocument()
  })
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
      "termId=t1&status=CONFIRMED&gender=FEMALE&payment=UNPAID",
    )
  })
  it("shows the place in the waitlist, by gender, and explains the waitlist view", async () => {
    const waiting = (id: string, gender: string, position: number) => ({
      ...application,
      id,
      gender,
      terms: [{ ...application.terms[1], waitlistPosition: position }],
    })
    setup([waiting("a1", "FEMALE", 1), waiting("a2", "MALE", 2)], false, undefined, null, {
      term: "t2",
      status: "WAITLISTED",
    })
    expect((await screen.findAllByText("Waitlisted · 1")).length).toBeGreaterThan(0)
    expect(screen.getAllByText("Waitlisted · 2").length).toBeGreaterThan(0)
    expect(screen.getByText("Sorted: waitlist order")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent(/not a confirmed place/)
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
  it("clears search and every filter from an empty result and distinguishes an event with no applications", async () => {
    const change = setup([], false, "Nobody")
    expect(
      await screen.findByText("We found no applications matching this selection."),
    ).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole("button", { name: "Clear search and filters" }))
    expect(change).toHaveBeenCalledWith({})
    expect(screen.getByRole("searchbox")).toHaveValue("")
    expect(screen.getByRole("searchbox")).toHaveFocus()
    expect(await screen.findByText("No applications have been received yet.")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Clear search and filters" }),
    ).not.toBeInTheDocument()
  })
  it("offers retry after a failed request", async () => {
    setup([], true)
    expect(await screen.findByText("Could not load applications")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument()
  })
  it("offers the four payment states and sends the chosen one to the API", async () => {
    const change = setup([application], false, undefined, null, {})
    const user = userEvent.setup()
    await screen.findAllByText("jana@example.com", { exact: false })
    await user.click(screen.getAllByRole("combobox", { name: "Payment" })[0]!)
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "All payments",
      "Unpaid",
      "Partially paid",
      "Paid",
      "Overpaid",
    ])
    await user.click(screen.getByRole("option", { name: "Partially paid" }))
    expect(change).toHaveBeenLastCalledWith({ payment: "PARTIALLY_PAID" })
    expect(get).toHaveBeenLastCalledWith(
      expect.stringContaining("applications"),
      expect.objectContaining({ searchParams: new URLSearchParams("payment=PARTIALLY_PAID") }),
    )
  })
  it.each([
    [600, "Record payment"],
    [0, "Detail"],
    [-100, "Detail"],
  ])("labels the row action for an amount owed of %s as %s", async (amountOwedCzk, label) => {
    setup([{ ...application, amountOwedCzk }])
    expect(await screen.findByRole("link", { name: label })).toHaveAttribute(
      "href",
      "/organizer/events/e1/applications/a1",
    )
  })
  it.each([
    ["no terms", { roomCount: 1, terms: [] }],
    [
      "no rooms",
      {
        roomCount: 0,
        terms: [
          {
            id: "t1",
            name: "First",
            startsOn: "2027-07-12",
            endsOn: "2027-07-18",
            capacity: 0,
            confirmed: 0,
            free: 0,
            waitlisted: 0,
            byGender: null,
          },
        ],
      },
    ],
  ])("says the event is unfinished instead of empty with %s", async (_name, occupancy) => {
    setup([], false, undefined, occupancy, {})
    expect(await screen.findByText("The event is not finished yet")).toBeInTheDocument()
    expect(screen.queryByText("No applications have been received yet.")).not.toBeInTheDocument()
  })
})
