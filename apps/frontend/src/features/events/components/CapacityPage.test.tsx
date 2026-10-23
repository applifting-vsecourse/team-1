import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { EventCapacity } from "@/features/events/api/capacity"
import { CapacityPage } from "@/features/events/components/CapacityPage"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get } }))
const fixture = (): EventCapacity => ({
  eventName: "Summer camp",
  roomMode: "GENDERED",
  rooms: [
    { id: "r1", name: "1", gender: "FEMALE", capacity: 5 },
    { id: "r2", name: "2", gender: "FEMALE", capacity: 5 },
    { id: "r3", name: "3", gender: "FEMALE", capacity: 4 },
    { id: "r4", name: "4", gender: "MALE", capacity: 5 },
  ],
  terms: [
    {
      termId: "t1",
      name: "Week 1",
      startsOn: "2027-07-04",
      endsOn: "2027-07-10",
      capacity: { FEMALE: 14, MALE: 5 },
      freePlaces: { FEMALE: 2, MALE: 0 },
    },
    {
      termId: "t2",
      name: "Week 2",
      startsOn: "2027-07-11",
      endsOn: "2027-07-17",
      capacity: { FEMALE: 14, MALE: 5 },
      freePlaces: { FEMALE: 10, MALE: 4 },
    },
  ],
})
function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider client={client}>
        <CapacityPage eventId="e1" />
      </QueryClientProvider>
    ),
  })
  const rooms = createRoute({
    getParentRoute: () => root,
    path: "/organizer/events/$eventId/rooms",
  })
  const router = createRouter({
    routeTree: root.addChildren([rooms]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(<RouterProvider router={router} />)
}
describe("read-only capacity overview", () => {
  beforeEach(() => get.mockReset())
  it("shows loading and an empty event", async () => {
    let resolve!: (data: EventCapacity) => void
    get.mockReturnValue({
      json: () =>
        new Promise<EventCapacity>((done) => {
          resolve = done
        }),
    })
    renderPage()
    expect(await screen.findByText("Loading…")).toBeInTheDocument()
    resolve({ ...fixture(), rooms: [], terms: [] })
    expect(await screen.findByText(/No terms yet/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Manage rooms" })).toHaveAttribute(
      "href",
      "/organizer/events/e1/rooms",
    )
  })
  it("shows a read failure with retry", async () => {
    get.mockReturnValue({ json: () => Promise.reject(new Error("Offline")) })
    renderPage()
    expect(await screen.findByText("Offline")).toBeInTheDocument()
    get.mockReturnValue({ json: () => Promise.resolve(fixture()) })
    await userEvent.click(screen.getByRole("button", { name: /Try again/ }))
    expect(await screen.findByText("12 / 14")).toBeInTheDocument()
  })
  it("explains shared mode without attempting gendered calculations", async () => {
    get.mockReturnValue({
      json: () =>
        Promise.resolve({
          ...fixture(),
          roomMode: "SHARED",
          rooms: [{ id: "shared", name: "Shared", gender: null, capacity: 5000 }],
          terms: [],
        }),
    })
    renderPage()
    expect(
      await screen.findByText(
        "This event has shared rooms. Their capacity overview is not available yet.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument()
  })
  it("does not expose raw schema validation errors", async () => {
    get.mockReturnValue({
      json: () =>
        Promise.resolve({
          ...fixture(),
          rooms: [{ id: "bad", name: "Bad", gender: "UNKNOWN", capacity: 1 }],
        }),
    })
    renderPage()
    expect(
      await screen.findByText("The server response could not be read. Please try again."),
    ).toBeInTheDocument()
    expect(screen.queryByText(/invalid_value|Invalid option|ZodError/)).not.toBeInTheDocument()
  })
  it("shows capacities and room-size summaries, with no room management controls", async () => {
    get.mockReturnValue({ json: () => Promise.resolve(fixture()) })
    renderPage()
    expect(await screen.findByText("12 / 14")).toBeInTheDocument()
    expect(screen.getByText("5 / 5")).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.queryByRole("tab")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Manage rooms" })).toHaveAttribute(
      "href",
      "/organizer/events/e1/rooms",
    )
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /Add room|Edit|Delete|Save/ }),
    ).not.toBeInTheDocument()
  })
  it("switches terms while management still links to US-14 accommodation", async () => {
    HTMLElement.prototype.scrollIntoView = vi.fn()
    get.mockReturnValue({ json: () => Promise.resolve(fixture()) })
    renderPage()
    fireEvent.keyDown(await screen.findByRole("combobox", { name: "Term" }), { key: "ArrowDown" })
    fireEvent.click(await screen.findByRole("option", { name: "11–17 Jul 2027" }))
    expect(await screen.findByText("4 / 14")).toBeInTheDocument()
    expect(screen.getByText("1 / 5")).toBeInTheDocument()
    expect(screen.queryByText("12 / 14")).not.toBeInTheDocument()
    expect(screen.queryByText("5 / 5")).not.toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Manage rooms" })).toHaveAttribute(
      "href",
      "/organizer/events/e1/rooms",
    )
  })
  it("reads rooms above the former capacity limit", async () => {
    const data = fixture()
    data.rooms = data.rooms.map((room, index) => (index === 0 ? { ...room, capacity: 5000 } : room))
    data.terms = data.terms.map((term) => ({
      ...term,
      capacity: { ...term.capacity, FEMALE: 5009 },
      freePlaces: { ...term.freePlaces, FEMALE: term.freePlaces.FEMALE + 4995 },
    }))
    get.mockReturnValue({ json: () => Promise.resolve(data) })
    renderPage()
    expect(await screen.findByText("12 / 5009")).toBeInTheDocument()
  })
})
