import type * as Dnd from "@dnd-kit/core"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { RoomAssignments } from "@/features/events/api/room-assignments"
import { RoomAssignmentsCard } from "@/features/events/components/RoomAssignmentsCard"

// jsdom has no layout, so a drag is driven through the handlers the card gives to the context.
const { dnd } = vi.hoisted(() => ({
  dnd: {
    props: null as null | { onDragStart: (e: unknown) => void; onDragEnd: (e: unknown) => void },
  },
}))
vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<Record<string, never> & typeof Dnd>()
  return {
    ...actual,
    DndContext: (props: React.ComponentProps<typeof actual.DndContext>) => {
      dnd.props = props as never
      return <actual.DndContext {...props} />
    },
  }
})

// Radix measures things jsdom doesn't have.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)
Element.prototype.hasPointerCapture = () => false
Element.prototype.scrollIntoView = vi.fn()

const { get, put, del, success, error } = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock("@/lib/api-client", () => ({
  api: { get, put, delete: del },
  apiErrorCode: () => undefined,
}))
vi.mock("@/lib/notify", () => ({ notify: { success, error } }))

const person = (id: string, firstName: string, lastName: string, status = "CONFIRMED") => ({
  applicationTermId: id,
  applicationId: `a-${id}`,
  firstName,
  lastName,
  gender: "FEMALE" as const,
  status: status as "CONFIRMED" | "TO_EVALUATE",
})
const room = (
  id: string,
  name: string,
  beds: number,
  participants: ReturnType<typeof person>[] = [],
  extraBeds = 0,
) => ({
  id,
  name,
  capacity: beds - extraBeds,
  extraBeds,
  beds,
  gender: "FEMALE" as const,
  participants,
})
const otherTerm = {
  termId: "t2",
  name: "Week 2",
  startsOn: "2027-07-19",
  endsOn: "2027-07-25",
  rooms: [{ id: "r3-t2", name: "Room C", gender: "FEMALE" as const, freeBeds: 2 }],
}
const base = (): RoomAssignments => ({
  eventId: "e1",
  termId: "t1",
  rooms: [
    room("r1", "Room A", 4, [person("p1", "Jana", "Nováková")]),
    room("r2", "Room B", 1, [person("p2", "Eva", "Horká")]),
    room("r3", "Room C", 3),
  ],
  unassigned: [
    { ...person("p3", "Barbora", "Šimková"), alsoInTerms: [otherTerm] },
    { ...person("p4", "Nikola", "Králová", "TO_EVALUATE"), alsoInTerms: [] },
  ],
})

let data = base()
const term = { eventId: "e1", termId: "t1", startsOn: "2027-07-12", endsOn: "2027-07-18" }

function renderCard() {
  get.mockImplementation(() => ({ json: () => Promise.resolve(data) }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <RoomAssignmentsCard
        term={term}
        onAddRoom={vi.fn()}
        roomActions={(roomId) => <button type="button">{`Actions ${roomId}`}</button>}
      />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}
const dragFrom = (applicationTermId: string, name: string, fromRoomId: string | null) => ({
  active: { data: { current: { applicationTermId, name, fromRoomId } } },
})
const overRoom = (roomId: string) => ({ over: { data: { current: { roomId } } } })
const drop = (from: ReturnType<typeof dragFrom>, roomId: string) => {
  act(() => dnd.props?.onDragStart(from))
  act(() => dnd.props?.onDragEnd({ ...from, ...overRoom(roomId) }))
}

describe("room assignment", () => {
  beforeEach(() => {
    data = base()
    for (const mock of [get, put, del, success, error]) mock.mockReset()
    put.mockResolvedValue(undefined)
    del.mockResolvedValue(undefined)
  })

  it("lists the unassigned with their status, the rooms with people and free beds, and the count", async () => {
    renderCard()
    expect(await screen.findByText("Barbora Šimková")).toBeInTheDocument()
    expect(screen.getByText("Woman · Confirmed")).toBeInTheDocument()
    expect(screen.getByText("Woman · To evaluate")).toBeInTheDocument()
    expect(screen.getByLabelText("Unassigned participants: 2")).toHaveTextContent("2")
    const table = screen.getByRole("table")
    expect(within(table).getByText("Jana Nováková")).toBeInTheDocument()
    expect(within(table).getAllByText("3 free beds")).toHaveLength(2)
    expect(within(table).getByText("Full")).toBeInTheDocument()
    expect(screen.getByText("Beds").nextSibling).toHaveTextContent("8")
    expect(screen.getByText("Occupied").nextSibling).toHaveTextContent("2")
    expect(screen.getByText("Free beds").nextSibling).toHaveTextContent("6")
  })

  it("assigns through the dialog without a drag and confirms with a toast", async () => {
    const user = renderCard()
    await user.click(await screen.findByRole("button", { name: "Assign Nikola Králová to a room" }))
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("radio", { name: /Room C/ }))
    expect(
      within(dialog).getByText(/After saving, Nikola Králová will be in Room C/),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "Assign" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(put).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p4", {
      json: { roomId: "r3", alsoTermIds: [] },
    })
    await waitFor(() => expect(success).toHaveBeenCalled())
  })

  it("does not offer a full room and asks for a room before saving", async () => {
    const user = renderCard()
    await user.click(await screen.findByRole("button", { name: "Assign Nikola Králová to a room" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByRole("radio", { name: /Room B/ })).toBeDisabled()
    await user.click(within(dialog).getByRole("button", { name: "Assign" }))
    expect(await within(dialog).findByText("Choose a room.")).toBeInTheDocument()
    expect(put).not.toHaveBeenCalled()
  })

  it("assigns the same room in the other term in one step (AC3)", async () => {
    const user = renderCard()
    await user.click(
      await screen.findByRole("button", { name: "Assign Barbora Šimková to a room" }),
    )
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole("radio", { name: /Room C/ }))
    await user.click(
      await within(dialog).findByRole("checkbox", { name: /same room in the term .*Room C/ }),
    )
    expect(within(dialog).getByText(/in both terms/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "Assign" }))
    await waitFor(() => expect(put).toHaveBeenCalled())
    expect(put).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p3", {
      json: { roomId: "r3", alsoTermIds: ["t2"] },
    })
  })

  it("disables the same-room step when that room of the other term is full", async () => {
    data = {
      ...base(),
      unassigned: [
        {
          ...person("p3", "Barbora", "Šimková"),
          alsoInTerms: [
            {
              ...otherTerm,
              rooms: [{ id: "r3-t2", name: "Room C", gender: "FEMALE", freeBeds: 0 }],
            },
          ],
        },
      ],
    }
    const user = renderCard()
    await user.click(
      await screen.findByRole("button", { name: "Assign Barbora Šimková to a room" }),
    )
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("radio", { name: /Room C/ }))
    expect(
      await within(dialog).findByRole("checkbox", { name: /Room C.*full in that term/ }),
    ).toBeDisabled()
  })

  it("offers no same-room step when the other term has no room of that name", async () => {
    const user = renderCard()
    await user.click(
      await screen.findByRole("button", { name: "Assign Barbora Šimková to a room" }),
    )
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("radio", { name: /Room A/ }))
    expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument()
  })

  it("moves a person through the menu of their chip, the current room is not a choice", async () => {
    const user = renderCard()
    const table = await screen.findByRole("table")
    await user.click(within(table).getByRole("button", { name: "Actions for Jana Nováková" }))
    await user.click(await screen.findByRole("menuitem", { name: "Move to another room…" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByRole("radio", { name: /Room A.*Current room/ })).toBeDisabled()
    await user.click(within(dialog).getByRole("radio", { name: /Room C/ }))
    await user.click(within(dialog).getByRole("button", { name: "Move" }))
    await waitFor(() => expect(put).toHaveBeenCalled())
    expect(put).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p1", {
      json: { roomId: "r3", alsoTermIds: [] },
    })
  })

  it("removes a person from the room through the menu", async () => {
    const user = renderCard()
    const table = await screen.findByRole("table")
    await user.click(within(table).getByRole("button", { name: "Actions for Eva Horká" }))
    await user.click(await screen.findByRole("menuitem", { name: "Remove from room" }))
    await waitFor(() =>
      expect(del).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p2"),
    )
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith("Participant has no room again", "Eva Horká"),
    )
  })

  it("assigns by dragging an unassigned person onto a room with a free bed", async () => {
    renderCard()
    await screen.findByText("Barbora Šimková")
    drop(dragFrom("p3", "Barbora Šimková", null), "r3")
    await waitFor(() => expect(put).toHaveBeenCalled())
    expect(put).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p3", {
      json: { roomId: "r3", alsoTermIds: [] },
    })
  })

  it("does not take a drop on a full room", async () => {
    renderCard()
    await screen.findByText("Barbora Šimková")
    drop(dragFrom("p3", "Barbora Šimková", null), "r2")
    expect(put).not.toHaveBeenCalled()
  })

  it("moves a person by dragging their chip onto another room", async () => {
    renderCard()
    await screen.findByText("Barbora Šimková")
    drop(dragFrom("p1", "Jana Nováková", "r1"), "r3")
    await waitFor(() => expect(put).toHaveBeenCalled())
    expect(put).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p1", {
      json: { roomId: "r3", alsoTermIds: [] },
    })
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith(
        "Participant moved to the room",
        "Jana Nováková · Room C · Women's",
      ),
    )
  })

  it("does nothing when a chip is dropped on its own room", async () => {
    renderCard()
    await screen.findByText("Barbora Šimková")
    drop(dragFrom("p1", "Jana Nováková", "r1"), "r1")
    expect(put).not.toHaveBeenCalled()
  })

  it("pages a long list of the unassigned", async () => {
    data = {
      ...base(),
      unassigned: Array.from({ length: 11 }, (_, index) => ({
        ...person(`u${index}`, "Test", `Osoba${String(index).padStart(2, "0")}`),
        alsoInTerms: [],
      })),
    }
    const user = renderCard()
    expect(await screen.findByText("Test Osoba00")).toBeInTheDocument()
    expect(screen.queryByText("Test Osoba08")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Next →" }))
    expect(await screen.findByText("Test Osoba08")).toBeInTheDocument()
    expect(screen.queryByText("Test Osoba00")).not.toBeInTheDocument()
  })

  it("says it is optional while nobody is assigned, without a warning", async () => {
    data = { ...base(), rooms: base().rooms.map((item) => ({ ...item, participants: [] })) }
    renderCard()
    expect(
      await screen.findByText("Assigning rooms is optional. You can do it any time, even on site."),
    ).toBeInTheDocument()
  })

  it("shows the empty states: no rooms, no confirmed, all assigned", async () => {
    data = { ...base(), rooms: [] }
    renderCard()
    expect(await screen.findByText("Rooms of this term will appear here.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add room" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Assign Nikola Králová to a room" })).toBeDisabled()
  })

  it("tells when there are no confirmed participants", async () => {
    data = {
      ...base(),
      unassigned: [],
      rooms: base().rooms.map((item) => ({ ...item, participants: [] })),
    }
    renderCard()
    expect(
      await screen.findByText("There are no confirmed participants in this term yet."),
    ).toBeInTheDocument()
  })

  it("tells when everyone is assigned", async () => {
    data = { ...base(), unassigned: [] }
    renderCard()
    expect(
      await screen.findByText("All participants of this term are assigned to rooms."),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Unassigned participants: 0")).toHaveTextContent("0")
  })

  it("shows the rooms as cards at 360 px and keeps the count in a bar once the list is scrolled away", async () => {
    window.innerWidth = 360
    let notify: (entries: { isIntersecting: boolean }[]) => void = () => undefined
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: typeof notify) {
          notify = callback
        }
        observe = vi.fn()
        disconnect = vi.fn()
      },
    )
    renderCard()
    await screen.findByText("Barbora Šimková")
    expect(screen.getAllByText(/^Room A/).length).toBe(2)
    expect(screen.getAllByRole("button", { name: "Actions r1" }).length).toBe(2)
    expect(
      screen.queryByRole("status", { name: "Unassigned participants" }),
    ).not.toBeInTheDocument()
    act(() => notify([{ isIntersecting: false }]))
    expect(
      await screen.findByRole("status", { name: "Unassigned participants" }),
    ).toHaveTextContent("Unassigned participants2")
    vi.unstubAllGlobals()
  })
})
