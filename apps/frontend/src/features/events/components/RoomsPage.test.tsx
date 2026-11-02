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

import type { TermRooms } from "@/features/events/api/rooms"
import { RoomsPage, type AccommodationTerm } from "@/features/events/components/RoomsPage"

// Radix's radio group measures things jsdom doesn't have.
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
Element.prototype.scrollIntoView = vi.fn()

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get }, apiErrorCode: () => undefined }))

const terms: AccommodationTerm[] = [
  {
    id: "t1",
    name: "Week 1",
    startsOn: "2027-07-12",
    endsOn: "2027-07-18",
    roomMode: "GENDERED",
    byGender: { FEMALE: { free: 0 }, MALE: { free: 2 } },
  },
  {
    id: "t2",
    name: "Week 2",
    startsOn: "2027-07-19",
    endsOn: "2027-07-25",
    roomMode: "SHARED",
    byGender: null,
  },
]
const termRooms = (termId: string, rooms: TermRooms["rooms"], roomMode: TermRooms["roomMode"]) => ({
  eventId: "e1",
  eventName: "Summer camp",
  organizationName: "Camp",
  termId,
  termName: termId,
  startsOn: "2027-07-12",
  endsOn: "2027-07-18",
  roomMode,
  rooms,
  capacity: {
    FEMALE: rooms.filter((room) => room.gender === "FEMALE").reduce((n, r) => n + r.capacity, 0),
    MALE: rooms.filter((room) => room.gender === "MALE").reduce((n, r) => n + r.capacity, 0),
    total: rooms.reduce((n, r) => n + r.capacity, 0),
  },
})
const byTerm: Record<string, TermRooms> = {
  t1: termRooms(
    "t1",
    [
      { id: "r1", name: "Gendered room", gender: "FEMALE", capacity: 5000 },
      { id: "r2", name: "Men's room", gender: "MALE", capacity: 4 },
    ],
    "GENDERED",
  ),
  t2: termRooms("t2", [{ id: "s1", name: "Shared room", gender: null, capacity: 60 }], "SHARED"),
}

function renderRooms(termId: string) {
  const onSelectTerm = vi.fn()
  get.mockImplementation((path: string) => ({
    json: () => Promise.resolve(byTerm[/terms\/([^/]+)\/rooms/.exec(path)?.[1] ?? ""]),
  }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider client={client}>
        <RoomsPage
          eventId="e1"
          termId={termId}
          terms={terms}
          onSelectTerm={onSelectTerm}
        />
      </QueryClientProvider>
    ),
  })
  const termsRoute = createRoute({
    getParentRoute: () => root,
    path: "/organizer/events/$eventId/terms",
  })
  const router = createRouter({
    routeTree: root.addChildren([termsRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(<RouterProvider router={router} />)
  return { onSelectTerm, user: userEvent.setup() }
}

describe("accommodation by term", () => {
  beforeEach(() => get.mockReset())

  it("shows only the rooms of the selected term, with its metrics and gender column", async () => {
    renderRooms("t1")
    const table = await screen.findByRole("table")
    expect(within(table).getByText("Gendered room")).toBeInTheDocument()
    expect(within(table).queryByText("Shared room")).not.toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("organizer/events/e1/terms/t1/rooms")
    expect(screen.getByText("Women's rooms")).toBeInTheDocument()
    expect(screen.getByText("Capacity exhausted")).toBeInTheDocument()
    expect(screen.getByText("Beds available")).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Gender" })).toBeInTheDocument()
  })

  it("shows a shared term with its shared capacity and no gender column", async () => {
    renderRooms("t2")
    const table = await screen.findByRole("table")
    expect(within(table).getByText("Shared room")).toBeInTheDocument()
    expect(screen.getByText("Room capacity")).toBeInTheDocument()
    expect(screen.queryByRole("columnheader", { name: "Gender" })).not.toBeInTheDocument()
    expect(screen.queryByText("Capacity exhausted")).not.toBeInTheDocument()
  })

  it("keeps editing and deleting available and opens the room of the term", async () => {
    const { user } = renderRooms("t1")
    const table = await screen.findByRole("table")
    expect(screen.getByRole("button", { name: "Add room" })).toBeEnabled()
    expect(within(table).getByRole("button", { name: "Delete room Gendered room" })).toBeEnabled()
    await user.click(within(table).getByRole("button", { name: "Edit room Gendered room" }))
    expect(await screen.findByRole("spinbutton", { name: "Capacity *" })).toHaveValue(5000)
  })

  it("changes the mode through a confirmation, not directly on the page", async () => {
    const { user } = renderRooms("t2")
    await screen.findByRole("table")
    await user.click(screen.getByRole("combobox", { name: "Room mode" }))
    await user.click(await screen.findByRole("option", { name: "By gender" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Change room mode?")).toBeInTheDocument()
    expect(within(dialog).getByRole("group", { name: /Shared room/ })).toBeInTheDocument()
  })

  it("selects another term with the term select", async () => {
    const { user, onSelectTerm } = renderRooms("t1")
    await screen.findByRole("table")
    await user.click(screen.getByRole("combobox", { name: "Term" }))
    await user.click(await screen.findByRole("option", { name: "19–25 Jul 2027" }))
    expect(onSelectTerm).toHaveBeenCalledWith("t2")
  })
})
