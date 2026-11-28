import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { formatDate, formatDateRange, formatDateTime } from "@/lib/date"

import { ApplicationsPage } from "@/features/event-overview/components/ApplicationsPage"
import type { ApplicationsSearch } from "@/features/event-overview/lib/applications-search"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get } }))
// Radix Select scrolls and captures pointers using APIs absent from jsdom.
Element.prototype.hasPointerCapture = () => false
Element.prototype.scrollIntoView = vi.fn()
// Radix tooltips measure their trigger.
globalThis.ResizeObserver = class {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
const application = {
  id: "a1",
  firstName: "Jana",
  lastName: "Test",
  birthDate: "2000-01-01",
  gender: "FEMALE",
  individualAccommodation: false,
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
  occupancy: { terms: unknown[] } | null = null,
  initial?: ApplicationsSearch,
  isAutomatic = false,
) {
  get.mockImplementation((path: string) => ({
    json: () =>
      path.endsWith("occupancy")
        ? Promise.resolve({
            eventId: "e1",
            ...occupancy,
            terms: occupancy?.terms ?? [
              {
                id: "t1",
                name: "First",
                roomMode: "GENDERED",
                roomCount: 1,
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
      <>
        <Outlet />
        <ApplicationsPage
          eventId="e1"
          isAutomatic={isAutomatic}
          filters={filters}
          onFiltersChange={(next, options) => {
            if (options) onFiltersChange(next, options)
            else onFiltersChange(next)
            setFilters(next)
          }}
        />
      </>
    )
  }
  const root = createRootRoute({
    component: Page,
  })
  const route = createRoute({ getParentRoute: () => root, path: "/" })
  const detail = createRoute({
    getParentRoute: () => root,
    path: "/organizer/events/$eventId/applications/$applicationId",
    component: () => <p>Application detail page</p>,
  })
  const router = createRouter({
    routeTree: root.addChildren([route, detail]),
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
  describe("automatic capacity for a selected term (US-27)", () => {
    const figures = (capacity: number, confirmed: number) => ({
      capacity,
      confirmed,
      free: capacity - confirmed,
      waitlisted: 0,
    })
    const shared = {
      id: "t1",
      name: "First",
      startsOn: "2027-07-12",
      endsOn: "2027-07-18",
      roomMode: "SHARED",
      roomCount: 1,
      ...figures(2, 2),
      byGender: null,
    }

    it("shows the shared capacity and lists the oldest receipt before the newest", async () => {
      const older = {
        ...application,
        id: "a2",
        firstName: "Eva",
        submittedAt: "2026-11-17T12:00:00Z",
      }
      setup([application, older], false, undefined, { terms: [shared] }, { term: "t1" }, true)
      expect(await screen.findByText("Shared capacity: 2/2 beds")).toBeVisible()
      const rows = within(screen.getByRole("table")).getAllByRole("row")
      expect(rows[1]).toHaveTextContent("Eva Test")
      expect(rows[2]).toHaveTextContent("Jana Test")
    })

    it("keeps separate pools for women and men", async () => {
      const term = {
        ...shared,
        roomMode: "GENDERED",
        ...figures(100, 98),
        byGender: { FEMALE: figures(50, 50), MALE: figures(50, 48) },
      }
      setup([application], false, undefined, { terms: [term] }, { term: "t1" }, true)
      expect(await screen.findByText("Capacity by gender: women 50/50 · men 48/50")).toBeVisible()
      expect(screen.getByText(/The women’s beds are full/)).toBeVisible()
    })

    // The selected tab names the section, so the h2 is only for screen readers and the one primary
    // action ends the segment row (DESIGN.md, event header).
    it("names the section only for screen readers and ends the segment row with Add application", async () => {
      setup([application])
      const views = await screen.findByRole("radiogroup", { name: "Application views" })
      const add = screen.getByRole("link", { name: "Add application" })
      // The segment sits in its sideways scroll strip, which shares the row with the action.
      const strip = views.parentElement!
      expect(strip).toHaveClass("overflow-x-auto")
      expect(strip.parentElement).toBe(add.parentElement)
      expect(strip.parentElement).toHaveClass("justify-between")
      expect(screen.getByRole("heading", { level: 2, name: "Applications" })).toHaveClass("sr-only")
    })

    it("leaves a manual event’s order and heading in place", async () => {
      setup([application], false, undefined, { terms: [shared] }, { term: "t1" })
      await screen.findAllByText("Jana Test")
      expect(screen.queryByText("Shared capacity: 2/2 beds")).not.toBeInTheDocument()
      expect(screen.getByText("Sorted: most recently received applications")).toBeVisible()
    })
  })
  describe("individual accommodation (US-38)", () => {
    it("marks who asked for it in the table and the mobile cards, and nobody else", async () => {
      setup([
        { ...application, individualAccommodation: true },
        { ...application, id: "a2", firstName: "Eva", email: "eva@example.com" },
      ])
      await screen.findAllByText("Jana Test")
      // One badge in the table and one in the cards, for the one application with the request.
      expect(screen.getAllByText("Individual accommodation")).toHaveLength(2)
    })

    it("filters the list by individual accommodation, keeping the other filters", async () => {
      const user = userEvent.setup()
      const change = setup([application], false, undefined, null, { term: "t1" })
      await user.click(await screen.findByRole("combobox", { name: "Accommodation" }))
      await user.click(screen.getByRole("option", { name: "Individual" }))
      expect(change).toHaveBeenLastCalledWith({ term: "t1", accommodation: "INDIVIDUAL" })
    })

    it("sends the filter to the server", async () => {
      setup([application], false, undefined, null, { accommodation: "INDIVIDUAL" })
      await screen.findAllByText("Jana Test")
      const calls = get.mock.calls as [string, { searchParams: URLSearchParams }][]
      const listCall = calls.find(([path]) => path.endsWith("/applications"))
      expect(String(listCall?.[1].searchParams)).toBe("accommodation=INDIVIDUAL")
    })

    it("says nobody has asked for it when the filter finds nothing", async () => {
      setup([], false, undefined, null, { accommodation: "INDIVIDUAL" })
      expect(
        await screen.findByRole("heading", {
          name: "Nobody has asked for individual accommodation yet",
        }),
      ).toBeVisible()
      expect(screen.getByText(/as soon as an applicant makes it/)).toBeVisible()
      expect(screen.getByRole("button", { name: "Clear search and filters" })).toBeVisible()
    })

    it("keeps the general message when other filters are set too", async () => {
      setup([], false, undefined, null, { accommodation: "INDIVIDUAL", term: "t1" })
      expect(
        await screen.findByText("We found no applications matching this selection."),
      ).toBeVisible()
    })
  })

  it("applies a mobile selection immediately and keeps it after closing the panel", async () => {
    const change = setup([application], false, "Jana")
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Filters · 4" }))
    const dialog = screen.getByRole("dialog", { name: "Filters" })
    await user.click(within(dialog).getByRole("combobox", { name: "Status" }))
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
        name: "Remove filter: Unpaid",
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
    // Status, payment and term, and since US-38 the accommodation.
    expect(within(dialog).getAllByRole("combobox")).toHaveLength(4)
    await user.click(within(dialog).getByRole("button", { name: "Clear filters" }))
    expect(change).toHaveBeenLastCalledWith({})
    expect(within(dialog).getByRole("combobox", { name: "Status" })).toHaveTextContent(
      "All statuses",
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
  it("shows the whole search placeholder (#753)", async () => {
    setup()
    expect(await screen.findByRole("searchbox")).toHaveAttribute("placeholder", "Name, e-mail, VS")
  })
  it("starts at the first page of search results", async () => {
    setup(Array.from({ length: 21 }, (_, index) => ({ ...application, id: `a${index}` })))
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Next page" }))
    expect(screen.getByText("21–21 of 21 results")).toBeInTheDocument()
    await user.type(screen.getByRole("searchbox"), "jana")
    expect(await screen.findByText("1–20 of 21 results")).toBeInTheDocument()
  })
  describe("page in the URL (#734)", () => {
    const rows = Array.from({ length: 41 }, (_, index) => ({ ...application, id: `a${index}` }))

    it("writes the 1-based page to the search as a new history step, keeping the filters", async () => {
      const change = setup(rows)
      const user = userEvent.setup()
      await user.click(await screen.findByRole("button", { name: "Next page" }))
      expect(change).toHaveBeenLastCalledWith(
        { term: "t1", status: "CONFIRMED", payment: "UNPAID", gender: "FEMALE", page: 2 },
        { isPush: true },
      )
    })

    it("shows the page the URL holds, as after a reload or a shared link", async () => {
      setup(rows, false, undefined, null, { page: 3 })
      expect(await screen.findByText("41–41 of 41 results")).toBeInTheDocument()
    })

    it("returns to the first page when a filter or the search changes", async () => {
      const change = setup(rows, false, undefined, null, { term: "t1", page: 2 })
      const user = userEvent.setup()
      await user.type(await screen.findByRole("searchbox"), "j")
      expect(change).toHaveBeenLastCalledWith({ term: "t1", q: "j" })
    })

    it("falls back to the last existing page when the page is past the end", async () => {
      const change = setup(rows, false, undefined, null, { page: 9 })
      expect(await screen.findByText("41–41 of 41 results")).toBeInTheDocument()
      await waitFor(() => expect(change).toHaveBeenCalledWith({ page: 3 }, { isPush: false }))
    })
  })
  it("passes combined filters, displays all terms and links to payment", async () => {
    setup()
    expect(await screen.findAllByRole("button", { name: "Jana Test" })).toHaveLength(2)
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
  it("opens the waitlist view for the filters of the card Substitutes to resolve (#397)", async () => {
    const waiting = (id: string, gender: string, position: number) => ({
      ...application,
      id,
      gender,
      terms: [{ ...application.terms[1], waitlistPosition: position }],
    })
    setup([waiting("a1", "FEMALE", 1), waiting("a2", "MALE", 2)], false, undefined, null, {
      status: "WAITLISTED",
      waitlist: "FREE_BED",
    })
    expect((await screen.findAllByText("Waitlisted · 1")).length).toBeGreaterThan(0)
    expect(screen.getByRole("radio", { name: "Waitlisted" })).toBeChecked()
    // The free-bed filter is a select of its own, not a loose chip.
    expect(screen.getAllByRole("combobox", { name: "Waitlist" })[0]).toHaveTextContent(
      "Substitutes with a free bed",
    )
    expect(screen.getByRole("status")).toHaveTextContent(/not a confirmed place/)
    const request = get.mock.calls.find(([path]) => String(path).endsWith("applications"))!
    expect(String((request[1] as { searchParams: URLSearchParams }).searchParams)).toBe(
      "status=WAITLISTED&waitlist=FREE_BED",
    )
  })
  it("leaves the free-bed filter of the card when another view is chosen (#397)", async () => {
    const onFilters = setup([application], false, undefined, null, {
      status: "WAITLISTED",
      waitlist: "FREE_BED",
    })
    await screen.findByRole("radio", { name: "Waitlisted" })
    await userEvent.setup().click(screen.getByRole("radio", { name: "All applications" }))
    expect(onFilters).toHaveBeenLastCalledWith({})
    expect(screen.queryByRole("button", { name: /Substitutes with a free bed/ })).toBeNull()
  })
  it("reveals identifying details from the keyboard without leaving the list", async () => {
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
    const user = userEvent.setup()
    const table = await screen.findByRole("table")
    const [, first, second] = within(table).getAllByRole("row")
    const firstTrigger = within(first!).getByRole("button", { name: "Jana Test" })
    const secondTrigger = within(second!).getByRole("button", { name: "Jana Test" })

    const received = formatDateTime(application.submittedAt)
    expect(within(table).queryByRole("columnheader", { name: "Received" })).toBeNull()
    expect(within(first!).queryByText(received, { exact: false })).toBeNull()
    expect(firstTrigger).toHaveAttribute("aria-expanded", "false")
    expect(within(first!).queryByText("jana@example.com")).not.toBeInTheDocument()

    firstTrigger.focus()
    await user.keyboard("{Enter}")
    expect(firstTrigger).toHaveAttribute("aria-expanded", "true")
    expect(within(first!).getByText(received, { exact: false })).toBeVisible()
    await user.click(within(first!).getByText("jana@example.com"))
    expect(firstTrigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.queryByText("Application detail page")).not.toBeInTheDocument()
    expect(within(first!).getByText(formatDate("2000-01-01"), { exact: false })).toBeVisible()
    expect(within(first!).getByRole("link", { name: "Record payment" })).toHaveAttribute(
      "href",
      "/organizer/events/e1/applications/a1",
    )

    await user.click(secondTrigger)
    expect(within(second!).getByText("other@example.com")).toBeVisible()
    expect(within(second!).getByText(formatDate("2001-02-03"), { exact: false })).toBeVisible()
    expect(screen.queryByText("Application detail page")).not.toBeInTheDocument()
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
  it("offers the five payment states and sends the chosen one to the API", async () => {
    const change = setup([application], false, undefined, null, {})
    const user = userEvent.setup()
    await screen.findByRole("row", { name: /Jana Test/ })
    await user.click(screen.getAllByRole("combobox", { name: "Payment" })[0]!)
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "All payments",
      "With a debt",
      "Nothing due",
      "Unpaid",
      "Partly paid",
      "Paid",
      "Overpaid",
    ])
    await user.click(screen.getByRole("option", { name: "Partly paid" }))
    expect(change).toHaveBeenLastCalledWith({ payment: "PARTIALLY_PAID" })
    expect(get).toHaveBeenLastCalledWith(
      expect.stringContaining("applications"),
      expect.objectContaining({ searchParams: new URLSearchParams("payment=PARTIALLY_PAID") }),
    )
  })
  it.each([
    [600, "Record payment"],
    [0, "Application detail"],
    [-100, "Application detail"],
  ])("labels the row action for an amount owed of %s as %s", async (amountOwedCzk, label) => {
    setup([{ ...application, amountOwedCzk }])
    expect(await screen.findByRole("link", { name: label })).toHaveAttribute(
      "href",
      "/organizer/events/e1/applications/a1",
    )
  })
  it("shows one debt column and no amount-to-pay column", async () => {
    setup([application])
    await screen.findByRole("link", { name: "Record payment" })
    expect(screen.getByRole("columnheader", { name: "Due / debt" })).toBeInTheDocument()
    expect(screen.queryByRole("columnheader", { name: "Amount due" })).not.toBeInTheDocument()
  })
  describe("clickable row", () => {
    it("opens the detail when the row is clicked", async () => {
      setup([application], false, undefined, null, {})
      const row = await screen.findByRole("row", { name: /Jana Test/ })
      await userEvent.setup().click(within(row).getByText("Confirmed", { exact: true }))
      expect(await screen.findByText("Application detail page")).toBeInTheDocument()
    })
    it("keeps the detail link as the keyboard path", async () => {
      setup([application], false, undefined, null, {})
      const user = userEvent.setup()
      const link = await screen.findByRole("link", { name: "Record payment" })
      await user.tab()
      link.focus()
      await user.keyboard("{Enter}")
      expect(await screen.findByText("Application detail page")).toBeInTheDocument()
    })
    it("does not open the detail when a row is selected", async () => {
      setup([application], false, undefined, null, { status: "TO_EVALUATE" })
      const user = userEvent.setup()
      await screen.findByRole("row", { name: /Jana Test/ })
      const checkbox = screen.getAllByRole("checkbox", {
        name: /Select application: Jana Test/,
      })[0]!
      await user.click(checkbox)
      expect(checkbox).toBeChecked()
      expect(screen.queryByText("Application detail page")).not.toBeInTheDocument()
    })
  })
  it.each([
    ["no terms", { terms: [] }],
    [
      "no rooms",
      {
        terms: [
          {
            id: "t1",
            name: "First",
            roomMode: "GENDERED",
            roomCount: 0,
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

  describe("queue to evaluate (US-103)", () => {
    const waiting = {
      ...application,
      terms: [
        { ...application.terms[0], status: "TO_EVALUATE" },
        { ...application.terms[1], status: "CONFIRMED" },
      ],
    }

    it("lists who is waiting in the common table, oldest first", async () => {
      setup([waiting], false, undefined, null, { status: "TO_EVALUATE" })
      const row = await screen.findByRole("row", { name: /Jana Test/ })
      expect(within(row).getByRole("button", { name: "Jana Test" })).toBeVisible()
      expect(within(row).getByText("Awaiting evaluation")).toBeInTheDocument()
      expect(screen.getByText("Sorted: in order of receipt, oldest first")).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "Applications", level: 2 })).toHaveClass("sr-only")
      const calls = get.mock.calls as [string, { searchParams: URLSearchParams }][]
      const search = calls.find(([path]) => path.endsWith("applications"))![1].searchParams
      expect(search.get("status")).toBe("TO_EVALUATE")
    })

    it.each([
      ["TO_EVALUATE", "Awaiting evaluation"],
      ["WAITLISTED", "Waitlisted"],
    ] as const)("fixes the status filter to the %s view", async (status, label) => {
      setup([waiting], false, undefined, null, { status })
      const select = (await screen.findAllByRole("combobox", { name: "Status" }))[0]!
      expect(select).toBeDisabled()
      expect(select).toHaveTextContent(label)
      await userEvent.setup().hover(select.parentElement!)
      expect(await screen.findByRole("tooltip")).toHaveTextContent(
        /The status is set by the chosen view/,
      )
    })

    it("clears mobile filters while keeping the evaluation view", async () => {
      const change = setup([waiting], false, undefined, null, { status: "TO_EVALUATE", term: "t1" })
      const user = userEvent.setup()
      await user.click(await screen.findByRole("button", { name: "Filters · 1" }))
      const sheet = within(screen.getByRole("dialog", { name: "Filters" }))
      expect(sheet.getByText(/The status is set by the chosen view/)).toBeVisible()

      await user.click(sheet.getByRole("button", { name: "Clear filters" }))
      expect(change).toHaveBeenLastCalledWith({ status: "TO_EVALUATE" })
      expect(sheet.getByRole("button", { name: "Clear filters" })).toBeDisabled()
    })

    it.each([
      ["TO_EVALUATE", "Awaiting evaluation"],
      ["WAITLISTED", "Waitlisted"],
    ] as const)("keeps the %s view when clearing an empty result", async (status, view) => {
      const change = setup([], false, undefined, null, { status, payment: "UNPAID" })
      const reset = await screen.findByRole("button", { name: "Clear search and filters" })
      await userEvent.setup().click(reset)

      expect(change).toHaveBeenLastCalledWith({ status })
      expect(screen.getByRole("radio", { name: view })).toBeChecked()
      expect(screen.getByRole("searchbox")).toHaveFocus()
      expect(screen.queryByRole("button", { name: "Clear search and filters" })).toBeNull()
    })

    it("says so when nothing waits", async () => {
      setup([], false, undefined, null, { status: "TO_EVALUATE" })
      expect(await screen.findByText("All applications are evaluated.")).toBeInTheDocument()
    })

    it("keeps All applications lit for a status picked in the filter, and clears it on a press", async () => {
      const change = setup([application], false, undefined, null, { status: "CONFIRMED" })
      const user = userEvent.setup()
      const all = await screen.findByRole("radio", { name: "All applications" })
      expect(all).toBeChecked()
      await user.click(all)
      expect(change).toHaveBeenLastCalledWith({})
    })

    it("opens the queue from the view chips", async () => {
      const change = setup([application], false, undefined, null, {})
      const user = userEvent.setup()
      await user.click(await screen.findByRole("radio", { name: "Awaiting evaluation" }))
      expect(change).toHaveBeenLastCalledWith({ status: "TO_EVALUATE" })
    })
  })
})

/** A confirmed / waitlisted / cancelled term per index, one week each. */
const manyTerms = (count: number) =>
  Array.from({ length: count }, (_, index) => {
    const start = new Date(Date.UTC(2027, 0, 1 + index * 7))
    const end = new Date(Date.UTC(2027, 0, 7 + index * 7))
    return {
      id: `t${index}`,
      name: `Term ${index}`,
      startsOn: start.toISOString().slice(0, 10),
      endsOn: end.toISOString().slice(0, 10),
      status: (["CONFIRMED", "WAITLISTED", "CANCELLED"] as const)[index % 3],
      priceCzk: 1000,
    }
  })

describe("ApplicationsPage with a lot of content (#726, #727)", () => {
  const longName = "Maximiliána-Alexandra-Hohenlohe-Schillingsfürstová-".repeat(2)
  const longEmail = `${"a".repeat(100)}@${"b".repeat(40)}.example.com`

  it("lets a long name and e-mail wrap inside a bounded participant column (#726)", async () => {
    setup(
      [{ ...application, firstName: longName, lastName: "Novák", email: longEmail }],
      false,
      undefined,
      null,
      {},
    )
    const trigger = (await screen.findAllByRole("button", { name: new RegExp(longName) }))[0]!
    const cell = trigger.closest("td")!
    expect(cell).toHaveClass("whitespace-normal", "max-w-72")
    expect(trigger.querySelector(".wrap-anywhere")).not.toBeNull()
    await userEvent.setup().click(trigger)
    const email = screen.getAllByText(longEmail)[0]!
    expect(email.closest(".wrap-anywhere")).not.toBeNull()
  })

  it("collapses a hundred terms to three, a summary and a button to show them all (#727)", async () => {
    const user = userEvent.setup()
    setup([{ ...application, terms: manyTerms(100) }], false, undefined, null, {})
    const toggle = (await screen.findAllByRole("button", { name: "Show all (100)" }))[0]!
    const list = document.getElementById(toggle.getAttribute("aria-controls")!)!
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(list.children).toHaveLength(3)
    expect(
      screen.getAllByText(/\+ 97 more terms: .*confirmed.*waitlisted.*cancelled/)[0]!,
    ).toBeVisible()
    await user.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(list.children).toHaveLength(100)
    await user.click(screen.getAllByRole("button", { name: "Show fewer" })[0]!)
    expect(list.children).toHaveLength(3)
  })

  it("keeps a row with up to three terms as it was, without a summary (#727)", async () => {
    setup([{ ...application, terms: manyTerms(3) }], false, undefined, null, {})
    await screen.findAllByRole("button", { name: "Jana Test" })
    expect(screen.queryByRole("button", { name: /Show all/ })).not.toBeInTheDocument()
  })

  it("always shows the term the list is filtered by, even when it is the 77th (#727)", async () => {
    setup([{ ...application, terms: manyTerms(100) }], false, undefined, null, { term: "t77" })
    const toggle = (await screen.findAllByRole("button", { name: "Show all (100)" }))[0]!
    const list = document.getElementById(toggle.getAttribute("aria-controls")!)!
    expect(list.children).toHaveLength(3)
    expect(list.firstElementChild).toHaveTextContent(
      formatDateRange(manyTerms(100)[77]!.startsOn, manyTerms(100)[77]!.endsOn, {
        shouldShowYear: true,
      }),
    )
  })
})
