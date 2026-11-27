import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RoomsPage, type AccommodationTerm } from "@/features/events/components/RoomsPage"
import {
  roomsSearchSchema,
  withPage,
  withTerm,
  type RoomsSearch,
} from "@/features/events/lib/rooms-search"

// #728 and #698 over 300 rooms, with the page in the URL as the route of the accommodation keeps it.
const { get, put, del } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), del: vi.fn() }))
vi.mock("@/lib/api-client", () => ({
  api: { get, put, delete: del },
  apiErrorCode: () => undefined,
}))
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn() } }))

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)
// Radix's select uses pointer APIs jsdom doesn't have.
Element.prototype.hasPointerCapture = () => false
const scrollIntoView = vi.fn()
Element.prototype.scrollIntoView = scrollIntoView

const TOTAL = 300
const name = (index: number) => `Room ${String(index).padStart(3, "0")}`

/** One person sleeps in the first room of every page that the tests act on. */
const occupants: Record<number, string> = { 1: "Jana", 21: "Eva" }
let roomCount = TOTAL

const rooms = () =>
  Array.from({ length: roomCount }, (_, i) => ({
    id: `r${i + 1}`,
    name: name(i + 1),
    gender: "FEMALE" as const,
    capacity: 2,
    extraBeds: 0,
    beds: 2,
  }))
const participant = (firstName: string) => ({
  applicationTermId: `at-${firstName}`,
  applicationId: `a-${firstName}`,
  firstName,
  lastName: "Nováková",
  birthYear: 2011,
  gender: "FEMALE",
  individualAccommodation: false,
  accommodationRequest: null,
  status: "CONFIRMED",
  wishes: [],
})

const terms: AccommodationTerm[] = ["t1", "t2"].map((id, i) => ({
  id,
  name: `Week ${i + 1}`,
  startsOn: `2027-07-${12 + i * 7}`,
  endsOn: `2027-07-${18 + i * 7}`,
  roomCount: TOTAL,
  roomMode: "GENDERED",
  byGender: null,
}))

function respond(path: string): object {
  const termId = /terms\/([^/]+)\//.exec(path)?.[1] ?? "t1"
  if (path.endsWith("room-assignments")) {
    return {
      eventId: "e1",
      termId,
      rooms: rooms().map((room, i) => ({
        ...room,
        participants: occupants[i + 1] ? [participant(occupants[i + 1]!)] : [],
      })),
      unassigned: [],
      warnings: [],
      summary: { violations: 0, acknowledged: 0, confirmedWithoutBed: 0 },
    }
  }
  if (path.endsWith("/rooms")) {
    return {
      eventId: "e1",
      eventName: "Summer camp",
      organizationName: "Camp",
      organizationContactEmail: null,
      termId,
      termName: termId,
      startsOn: "2027-07-12",
      endsOn: "2027-07-18",
      roomMode: "GENDERED",
      roomsPublished: false,
      rooms: rooms(),
      capacity: { FEMALE: roomCount * 2, MALE: 0, total: roomCount * 2 },
    }
  }
  // Wishes, the proposal and the like are not what is tested here.
  throw new Error(`not mocked: ${path}`)
}

function renderAt(url: string) {
  get.mockImplementation((path: string) => ({
    json: () => Promise.resolve().then(() => respond(path)),
  }))
  del.mockResolvedValue(undefined)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const history = createMemoryHistory({ initialEntries: [url] })
  // The test router is not the registered one, so it is driven through its history.
  const go = (search: RoomsSearch, isReplace = false) => {
    const entries = Object.entries(search).filter(([, value]) => value !== undefined)
    const query = new URLSearchParams(entries.map(([key, value]) => [key, String(value)]))
    history[isReplace ? "replace" : "push"](`/rooms?${query.toString()}`)
  }
  const root = createRootRoute()
  const roomsRoute = createRoute({
    getParentRoute: () => root,
    path: "/rooms",
    validateSearch: roomsSearchSchema,
    component: function Rooms() {
      const current: RoomsSearch = roomsRoute.useSearch()
      const { termId, view, page } = current
      return (
        <QueryClientProvider client={client}>
          <RoomsPage
            eventId="e1"
            termId={termId}
            view={view ?? "assignment"}
            terms={terms}
            onSelectTerm={(next) => go(withTerm(current, next))}
            onSelectView={(next) =>
              go({ ...current, view: next === "assignment" ? undefined : next })
            }
            page={(page ?? 1) - 1}
            onPageChange={(next, options) => go(withPage(current, next), options?.isReplace)}
          />
        </QueryClientProvider>
      )
    },
  })
  const termsRoute = createRoute({
    getParentRoute: () => root,
    path: "/organizer/events/$eventId/terms",
  })
  const router = createRouter({
    routeTree: root.addChildren([roomsRoute, termsRoute]),
    history,
  })
  render(<RouterProvider router={router} />)
  const search = () => roomsSearchSchema.parse(router.state.location.search)
  return { user: userEvent.setup(), search, history, client }
}

/** The cards of the view Rooms; all of them are on the paper. */
const cards = () =>
  screen.getAllByRole("heading", { level: 3, name: /^Room \d{3}$/ }).map((heading) => ({
    name: heading.textContent,
    item: heading.closest("li") as HTMLElement,
  }))
const onScreen = () =>
  cards()
    .filter(({ item }) => !item.classList.contains("hidden"))
    .map((card) => card.name)
const pagination = () => screen.getByRole("navigation", { name: "Pagination" })
const goToPage = (user: ReturnType<typeof userEvent.setup>, page: number) =>
  user.click(within(pagination()).getByRole("button", { name: `Page ${page}` }))
const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => name(from + i))

beforeEach(() => {
  roomCount = TOTAL
  get.mockReset()
  del.mockReset()
  scrollIntoView.mockReset()
})

describe("paged rooms in the view Rooms (#728)", () => {
  it("shows 20 of 300 rooms, keeps the page in the URL and prints them all", async () => {
    const { user, search, history } = renderAt("/rooms?termId=t1&view=overview")
    await screen.findByRole("navigation", { name: "Pagination" })
    expect(onScreen()).toEqual(range(1, 20))
    expect(pagination()).toHaveTextContent("1–20 of 300 results")

    await goToPage(user, 2)
    await waitFor(() => expect(onScreen()).toEqual(range(21, 40)))
    expect(search().page).toBe(2)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" })
    // On paper every room is there: the ones off the page are hidden on screen only.
    expect(cards()).toHaveLength(TOTAL)
    for (const { name: room, item } of cards()) {
      if (!range(21, 40).includes(room)) expect(item).toHaveClass("hidden", "print:block")
    }
    // The summary counts the whole term.
    expect(screen.getAllByText("600").length).toBeGreaterThan(0)

    act(() => history.back())
    await waitFor(() => expect(onScreen()).toEqual(range(1, 20)))
    expect(search().page).toBeUndefined()
  })

  it("opens the page of a shared link and goes back to the first one with another term", async () => {
    const { user, search } = renderAt("/rooms?termId=t1&view=overview&page=3")
    await screen.findByRole("navigation", { name: "Pagination" })
    expect(onScreen()).toEqual(range(41, 60))

    await user.click(screen.getByRole("combobox", { name: "Term" }))
    await user.click(await screen.findByRole("option", { name: /19/ }))
    await waitFor(() => expect(search()).toMatchObject({ termId: "t2" }))
    await waitFor(() => expect(onScreen()).toEqual(range(1, 20)))
    expect(search().page).toBeUndefined()
  })

  it("stays on the page after a participant is removed from a room", async () => {
    const { user, search } = renderAt("/rooms?termId=t1&view=overview&page=2")
    await user.click(await screen.findByRole("button", { name: "Beds · Room 021" }))
    await user.click(screen.getByRole("button", { name: "Actions for Eva Nováková" }))
    const loads = get.mock.calls.length
    await user.click(await screen.findByRole("menuitem", { name: "Remove from room" }))
    await waitFor(() => expect(del).toHaveBeenCalledOnce())
    await waitFor(() => expect(get.mock.calls.length).toBeGreaterThan(loads))
    expect(search().page).toBe(2)
    expect(onScreen()).toEqual(range(21, 40))
  })

  it("shows the last page for a page that no longer exists", async () => {
    roomCount = 41
    const { search } = renderAt("/rooms?termId=t1&view=overview&page=9")
    await waitFor(() => expect(search().page).toBe(3))
    expect(onScreen()).toEqual([name(41)])
  })

  it("has no pagination for 20 rooms", async () => {
    roomCount = 20
    renderAt("/rooms?termId=t1&view=overview")
    await screen.findByRole("heading", { name: name(20), level: 3 })
    expect(screen.queryByRole("navigation", { name: "Pagination" })).not.toBeInTheDocument()
  })
})

describe("paged rooms in the room assignment (#728)", () => {
  const table = () => screen.getByRole("table")
  const inTable = (room: number) => within(table()).queryByText(name(room))

  it("pages the table, keeps the page across the views and prints all rooms", async () => {
    const { user, search } = renderAt("/rooms?termId=t1")
    await screen.findByRole("table")
    expect(within(table()).getAllByText(/^Room \d{3}$/)).toHaveLength(20)

    await goToPage(user, 2)
    await waitFor(() => expect(inTable(21)).toBeInTheDocument())
    expect(inTable(1)).not.toBeInTheDocument()
    expect(search().page).toBe(2)
    // This view doesn't print its table: the one print area is the sheet of the term, with every room.
    const [sheet, ...others] = Array.from(
      document.querySelectorAll<HTMLElement>("[data-print-area]"),
    )
    expect(others).toHaveLength(0)
    expect(sheet).toHaveClass("hidden", "print:flex")
    expect(sheet).not.toContainElement(table())
    expect(within(sheet!).getAllByRole("heading", { level: 3, name: /^Room \d{3}$/ })).toHaveLength(
      TOTAL,
    )

    await user.click(screen.getByRole("radio", { name: "Rooms" }))
    await waitFor(() => expect(search().view).toBe("overview"))
    await waitFor(() => expect(onScreen()).toEqual(range(21, 40)))
  })

  it("searches all rooms and returns to the first page", async () => {
    const { user, search } = renderAt("/rooms?termId=t1&page=4")
    await screen.findByRole("table")
    expect(inTable(61)).toBeInTheDocument()
    const input = screen.getByRole("searchbox", { name: "Search rooms" })

    // "Room 2" matches 100 rooms, so a stale page 4 would exist; the search still starts at 1.
    await user.type(input, "Room 2")
    await waitFor(() => expect(search().page).toBeUndefined())
    expect(inTable(200)).toBeInTheDocument()
    expect(inTable(220)).not.toBeInTheDocument()
    expect(pagination()).toHaveTextContent("1–20 of 100 results")

    await goToPage(user, 3)
    await waitFor(() => expect(search().page).toBe(3))
    await user.click(screen.getByRole("button", { name: "Clear search" }))
    await waitFor(() => expect(search().page).toBeUndefined())
    expect(inTable(1)).toBeInTheDocument()
  })
})

describe("expand and collapse all beds (#698)", () => {
  const beds = (room: number) => screen.getByRole("button", { name: `Beds · ${name(room)}` })
  const button = (label: "Expand all" | "Collapse all") =>
    screen.getByRole("button", { name: label })

  it("lists and hides the beds of every room, also on the other pages", async () => {
    const { user } = renderAt("/rooms?termId=t1&view=overview")
    await screen.findByRole("navigation", { name: "Pagination" })
    expect(button("Expand all")).toHaveAttribute("aria-expanded", "false")
    // Never on paper.
    expect(button("Expand all").closest(".print\\:hidden")).not.toBeNull()

    await user.click(button("Expand all"))
    expect(beds(1)).toHaveAttribute("aria-expanded", "true")
    expect(beds(20)).toHaveAttribute("aria-expanded", "true")
    expect(button("Collapse all")).toHaveAttribute("aria-expanded", "true")
    await goToPage(user, 2)
    await waitFor(() => expect(beds(21)).toHaveAttribute("aria-expanded", "true"))

    await user.click(button("Collapse all"))
    expect(beds(21)).toHaveAttribute("aria-expanded", "false")
    await goToPage(user, 1)
    await waitFor(() => expect(beds(1)).toHaveAttribute("aria-expanded", "false"))
  })

  it("offers to collapse while at least one room is open", async () => {
    const { user } = renderAt("/rooms?termId=t1&view=overview")
    await screen.findByRole("navigation", { name: "Pagination" })

    await user.click(beds(2))
    expect(button("Collapse all")).toBeInTheDocument()
    // Closing the last open room by hand brings the first label back.
    await user.click(beds(2))
    expect(button("Expand all")).toBeInTheDocument()

    await user.click(beds(2))
    await user.click(button("Collapse all"))
    expect(beds(2)).toHaveAttribute("aria-expanded", "false")
  })

  it("starts collapsed in another term and is offered only in the view Rooms", async () => {
    const { user } = renderAt("/rooms?termId=t1&view=overview")
    await screen.findByRole("navigation", { name: "Pagination" })
    await user.click(button("Expand all"))

    await user.click(screen.getByRole("combobox", { name: "Term" }))
    await user.click(await screen.findByRole("option", { name: /19/ }))
    await screen.findByRole("button", { name: "Expand all" })
    expect(beds(1)).toHaveAttribute("aria-expanded", "false")

    await user.click(screen.getByRole("radio", { name: "Assignment" }))
    await screen.findByRole("table")
    expect(
      screen.queryByRole("button", { name: /Expand all|Collapse all/ }),
    ).not.toBeInTheDocument()
  })
})
