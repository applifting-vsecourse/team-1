import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
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

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get }, apiErrorCode: () => undefined }))

const figures = (capacity: number, confirmed: number) => ({
  capacity,
  confirmed,
  free: capacity - confirmed,
})
const terms: AccommodationTerm[] = [
  {
    id: "t1",
    name: "Week 1",
    startsOn: "2027-07-12",
    endsOn: "2027-07-18",
    roomMode: "GENDERED",
    roomCount: 2,
    capacity: 100,
    byGender: { FEMALE: figures(50, 50), MALE: figures(50, 48) },
  },
  {
    id: "t2",
    name: "Week 2",
    startsOn: "2027-07-19",
    endsOn: "2027-07-25",
    roomMode: "SHARED",
    roomCount: 1,
    capacity: 60,
    byGender: null,
  },
  {
    id: "t3",
    name: "Week 3",
    startsOn: "2027-08-02",
    endsOn: "2027-08-08",
    roomMode: "SHARED",
    roomCount: 0,
    capacity: 0,
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
  capacity: { FEMALE: 0, MALE: 0, total: rooms.reduce((sum, room) => sum + room.capacity, 0) },
})
const byTerm: Record<string, TermRooms> = {
  t1: termRooms(
    "t1",
    Array.from({ length: 12 }, (_, index) => ({
      id: `r${index}`,
      name: `Room ${index + 1}`,
      capacity: 5,
      gender: index % 2 ? ("MALE" as const) : ("FEMALE" as const),
    })),
    "GENDERED",
  ),
  t2: termRooms("t2", [{ id: "s1", name: "Room 201", capacity: 60, gender: null }], "SHARED"),
  t3: termRooms("t3", [], "SHARED"),
}

function renderRooms(termId?: string) {
  const onSelectTerm = vi.fn()
  get.mockImplementation((path: string) => ({
    json: () => Promise.resolve(byTerm[/terms\/([^/]+)\/rooms/.exec(path)?.[1] ?? ""]),
  }))
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RoomsPage
        eventId="e1"
        termId={termId}
        terms={terms}
        onSelectTerm={onSelectTerm}
      />
    </QueryClientProvider>,
  )
  return { onSelectTerm, user: userEvent.setup() }
}

describe("accommodation by term", () => {
  beforeEach(() => get.mockReset())

  it("shows the room mode and capacity of every term next to each other", async () => {
    renderRooms("t1")
    expect(await screen.findByText("Room 1")).toBeInTheDocument()
    expect(screen.getByText("50 women's + 50 men's beds")).toBeInTheDocument()
    expect(screen.getByText("60 beds")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Manage term rooms" })).toHaveLength(3)
    expect(get).toHaveBeenCalledWith("organizer/events/e1/terms/t1/rooms")
  })

  it("loads the rooms of the term chosen with its card", async () => {
    const { user, onSelectTerm } = renderRooms("t1")
    await screen.findByText("Room 1")
    await user.click(screen.getAllByRole("button", { name: "Manage term rooms" })[1]!)
    expect(onSelectTerm).toHaveBeenCalledWith("t2")
  })

  it("splits the gendered capacity into groups and warns that men's beds do not replace women's", async () => {
    renderRooms("t1")
    expect(await screen.findByText("Women's beds")).toBeInTheDocument()
    expect(screen.getByText("Capacity exhausted")).toBeInTheDocument()
    expect(screen.getByText("Beds available")).toBeInTheDocument()
    expect(screen.getByText("Men's beds do not replace missing women's beds.")).toBeInTheDocument()
    expect(
      screen.getByText(/waitlisted in this term even though 2 men's beds remain/),
    ).toBeInTheDocument()
  })

  it("pages the rooms of the selected term", async () => {
    const { user } = renderRooms("t1")
    expect(await screen.findByText("10 per page")).toBeInTheDocument()
    expect(screen.getByText("1–10 of 12 rooms")).toBeInTheDocument()
    expect(screen.queryByText("Room 11")).not.toBeInTheDocument()
    await user.click(screen.getByRole("link", { name: "Next page" }))
    expect(screen.getByText("11–12 of 12 rooms")).toBeInTheDocument()
    expect(screen.getByText("Room 11")).toBeInTheDocument()
  })

  it("shows the shared capacity of a shared term and no gender groups", async () => {
    renderRooms("t2")
    expect(await screen.findByText("Room 201")).toBeInTheDocument()
    expect(screen.queryByText("Women's beds")).not.toBeInTheDocument()
    expect(screen.getByText("Shared room")).toBeInTheDocument()
    expect(screen.getByText("Capacity of this term")).toBeInTheDocument()
  })

  it("says a term without rooms has no capacity and closes the public application", async () => {
    renderRooms("t3")
    expect(await screen.findByText("No rooms yet")).toBeInTheDocument()
    expect(screen.getByText("This term has no accommodation or capacity yet.")).toBeInTheDocument()
    expect(
      screen.getByText("The public application is temporarily unavailable."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add room" })).toBeEnabled()
  })

  it("opens a dialog to change the mode instead of changing it on the page", async () => {
    const { user } = renderRooms("t2")
    await screen.findByText("Room 201")
    await user.click(screen.getByRole("button", { name: "Change room mode" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByRole("heading", { name: "Change room mode" })).toBeInTheDocument()
    expect(within(dialog).getByRole("radio", { name: "By gender" })).toBeChecked()
  })
})
