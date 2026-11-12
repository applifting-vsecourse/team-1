import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { TermRooms } from "@/features/events/api/rooms"
import { RoomExtraBedsPage } from "@/features/events/components/RoomExtraBedsPage"
import type { AccommodationTerm } from "@/features/events/components/RoomsPage"

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

const { get, patch } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get, patch }, apiErrorCode: () => undefined }))
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn() } }))

const terms: AccommodationTerm[] = [
  {
    id: "t1",
    name: "Week 1",
    startsOn: "2027-07-12",
    endsOn: "2027-07-18",
    roomMode: "GENDERED",
    byGender: null,
  },
  {
    id: "t2",
    name: "Week 2",
    startsOn: "2027-07-19",
    endsOn: "2027-07-25",
    roomMode: "GENDERED",
    byGender: null,
  },
  {
    id: "t3",
    name: "Week 3",
    startsOn: "2027-07-26",
    endsOn: "2027-08-01",
    roomMode: "GENDERED",
    byGender: null,
  },
]
const termRooms = (termId: string, rooms: TermRooms["rooms"]): TermRooms => ({
  eventId: "e1",
  eventName: "Summer camp",
  organizationName: "Camp",
  termId,
  termName: termId,
  startsOn: "2027-07-12",
  endsOn: "2027-07-18",
  roomMode: "GENDERED",
  rooms,
  capacity: { FEMALE: 0, MALE: 0, total: 0 },
})
const byTerm: Record<string, TermRooms> = {
  t1: termRooms("t1", [
    { id: "a1", name: "Room A1", gender: "FEMALE", capacity: 4, extraBeds: 2, beds: 6 },
  ]),
  t2: termRooms("t2", [
    { id: "b1", name: "room a1", gender: "FEMALE", capacity: 4, extraBeds: 0, beds: 4 },
  ]),
  t3: termRooms("t3", [
    { id: "c1", name: "Other", gender: "FEMALE", capacity: 4, extraBeds: 0, beds: 4 },
  ]),
}

function renderPage() {
  get.mockImplementation((path: string) => ({
    json: () => Promise.resolve(byTerm[/terms\/([^/]+)\/rooms/.exec(path)?.[1] ?? ""]),
  }))
  const onSelectRoom = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <RoomExtraBedsPage
        eventId="e1"
        termId="t1"
        roomId="a1"
        terms={terms}
        onSelectRoom={onSelectRoom}
      />
    </QueryClientProvider>,
  )
  return { onSelectRoom, user: userEvent.setup() }
}

describe("extra beds of a room", () => {
  beforeEach(() => {
    get.mockReset()
    patch.mockReset()
  })

  it("shows the room, its base capacity, extra beds and total at 360 px", async () => {
    window.innerWidth = 360
    renderPage()
    expect(await screen.findByRole("heading", { name: "Room A1" })).toBeInTheDocument()
    expect(screen.getByText("Summer camp · Accommodation · Room A1")).toBeInTheDocument()
    expect(
      screen.getByText("Base capacity 4 beds · Extra beds 2 · Total 6 beds"),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Number of extra beds")).toHaveValue(2)
    expect(screen.getByText("Applies to the selected term only")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save extra beds" })).toBeEnabled()
  })

  it("saves the number for this term only", async () => {
    patch.mockResolvedValue(undefined)
    const { user } = renderPage()
    const input = await screen.findByLabelText("Number of extra beds")
    await user.clear(input)
    await user.type(input, "5")
    await user.click(screen.getByRole("button", { name: "Save extra beds" }))
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("organizer/events/e1/terms/t1/rooms/a1/extra-beds", {
        json: { extraBeds: 5 },
      }),
    )
  })

  it("does not accept a negative number", async () => {
    const { user } = renderPage()
    const input = await screen.findByLabelText("Number of extra beds")
    expect(input).toHaveAttribute("min", "0")
    await user.clear(input)
    await user.type(input, "-1")
    await user.click(screen.getByRole("button", { name: "Save extra beds" }))
    expect(patch).not.toHaveBeenCalled()
  })

  it("jumps to the room of the same name in another term and disables terms without it", async () => {
    const { user, onSelectRoom } = renderPage()
    await screen.findByRole("heading", { name: "Room A1" })
    await user.click(screen.getByRole("combobox", { name: "Term" }))
    expect(await screen.findByRole("option", { name: /Week 3/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    )
    await user.click(screen.getByRole("option", { name: /Week 2/ }))
    expect(onSelectRoom).toHaveBeenCalledWith("t2", "b1")
  })
})
