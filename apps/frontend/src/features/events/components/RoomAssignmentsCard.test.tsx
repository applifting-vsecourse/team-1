import type * as Dnd from "@dnd-kit/core"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { RoomAssignments, RoomWarning } from "@/features/events/api/room-assignments"
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

const { get, put, post, del, success, error } = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
  del: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock("@/lib/api-client", () => ({
  api: { get, put, post, delete: del },
  apiErrorCode: () => undefined,
}))
vi.mock("@/lib/notify", () => ({ notify: { success, error } }))

const person = (
  id: string,
  firstName: string,
  lastName: string,
  status = "CONFIRMED",
  isIndividual = false,
) => ({
  applicationTermId: id,
  applicationId: `a-${id}`,
  firstName,
  lastName,
  birthYear: 2011,
  gender: "FEMALE" as const,
  individualAccommodation: isIndividual,
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
  warnings: [],
  summary: { violations: 0, acknowledged: 0, confirmedWithoutBed: 0 },
})
const warning = (over: Partial<RoomWarning>): RoomWarning => ({
  kind: "OVERCROWDED",
  roomId: "r2",
  applicationTermId: null,
  acknowledged: false,
  note: null,
  acknowledgedAt: null,
  acknowledgedBy: null,
  ...over,
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
    for (const mock of [get, put, post, del, success, error]) mock.mockReset()
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

  it("asks for a room before saving", async () => {
    const user = renderCard()
    await user.click(await screen.findByRole("button", { name: "Assign Nikola Králová to a room" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByRole("radio", { name: /Room B/ })).toBeEnabled()
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

  it("confirms a drop only after the write succeeds", async () => {
    let finish!: () => void
    put.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve
      }),
    )
    renderCard()
    await screen.findByText("Barbora Šimková")
    drop(dragFrom("p3", "Barbora Šimková", null), "r3")
    await waitFor(() => expect(put).toHaveBeenCalled())
    expect(success).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Unassigned participants: 2")).toHaveTextContent("2")
    await act(() => finish())
    await waitFor(() => expect(success).toHaveBeenCalledTimes(1))
  })

  it("asks before a full room takes someone as an extra bed, and cancelling changes nothing", async () => {
    const user = renderCard()
    await screen.findByText("Barbora Šimková")
    drop(dragFrom("p3", "Barbora Šimková", null), "r2")
    const dialog = await screen.findByRole("dialog", { name: "Room B is full" })
    expect(within(dialog).getByText("1 + 1 extra bed")).toBeInTheDocument()
    expect(put).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(put).not.toHaveBeenCalled()
  })

  it("assigns as an extra bed after the confirmation (drag)", async () => {
    const user = renderCard()
    await screen.findByText("Barbora Šimková")
    drop(dragFrom("p3", "Barbora Šimková", null), "r2")
    const dialog = await screen.findByRole("dialog", { name: "Room B is full" })
    await user.click(within(dialog).getByRole("button", { name: "Assign as an extra bed" }))
    await waitFor(() => expect(put).toHaveBeenCalled())
    expect(put).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p3", {
      json: { roomId: "r2", alsoTermIds: [], confirmExtraBed: true },
    })
    await waitFor(() => expect(success).toHaveBeenCalled())
  })

  it("moves a person into a full room as an extra bed through the dialog", async () => {
    const user = renderCard()
    await user.click(await screen.findByRole("button", { name: "Assign Nikola Králová to a room" }))
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("radio", { name: /Room B/ }))
    await user.click(within(dialog).getByRole("button", { name: "Assign" }))
    const confirm = await screen.findByRole("dialog", { name: "Room B is full" })
    await user.click(within(confirm).getByRole("button", { name: "Assign as an extra bed" }))
    await waitFor(() => expect(put).toHaveBeenCalled())
    expect(put).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p4", {
      json: { roomId: "r2", alsoTermIds: [], confirmExtraBed: true },
    })
  })

  describe("individual accommodation (US-38)", () => {
    it("marks who asked for it, among the unassigned and in a room, and still lets them be assigned", async () => {
      data = {
        ...base(),
        rooms: [
          room("r1", "Room A", 4, [person("p1", "Jana", "Nováková", "CONFIRMED", true)]),
          room("r2", "Room B", 1, [person("p2", "Eva", "Horká")]),
        ],
        unassigned: [
          { ...person("p3", "Barbora", "Šimková", "TO_EVALUATE", true), alsoInTerms: [] },
          { ...person("p4", "Nikola", "Králová"), alsoInTerms: [] },
        ],
      }
      renderCard()
      expect(await screen.findByText("Barbora Šimková")).toBeInTheDocument()
      expect(screen.getByText("Woman · To evaluate")).toBeInTheDocument()
      // The unassigned one has the full badge; in the room, in the table and in the card of the
      // phone layout, the chip carries a short one. Nobody else has any.
      expect(screen.getAllByText("Individual accommodation")).toHaveLength(1)
      expect(screen.getAllByText("Individual")).toHaveLength(2)
      const table = screen.getByRole("table")
      expect(within(table).getByText("Individual")).toBeInTheDocument()
      expect(within(table).getByText("Eva Horká")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Assign Barbora Šimková to a room" })).toBeEnabled()
    })

    it("does not count them in the people of the mixed gender warning", async () => {
      const man = { ...person("p6", "Tomáš", "Dvořák"), gender: "MALE" as never }
      const partner = { ...person("p7", "Lucie", "Veselá", "CONFIRMED", true) }
      data = {
        ...base(),
        rooms: [room("r1", "Room A", 4, [person("p1", "Jana", "Nováková"), man, partner])],
        warnings: [warning({ kind: "MIXED_GENDER", roomId: "r1" })],
        summary: { violations: 1, acknowledged: 0, confirmedWithoutBed: 0 },
      }
      renderCard()
      // The text is on the page twice (desktop table and mobile card); both count the same.
      const texts = await screen.findAllByText("Mixed genders: 1 woman and 1 man.")
      expect(texts.length).toBeGreaterThan(0)
      expect(screen.queryByText("Mixed genders: 2 women and 1 man.")).not.toBeInTheDocument()
    })
  })

  describe("room rule warnings (US-37)", () => {
    const overcrowded = () => {
      data = {
        ...base(),
        rooms: [
          room("r1", "Room A", 4, [person("p1", "Jana", "Nováková")]),
          room("r2", "Room B", 1, [person("p2", "Eva", "Horká"), person("p5", "Iva", "Malá")]),
        ],
        warnings: [
          warning({}),
          warning({ kind: "CONFIRMED_WITHOUT_BED", roomId: null, applicationTermId: "p3" }),
        ],
        summary: { violations: 1, acknowledged: 0, confirmedWithoutBed: 1 },
      }
    }

    it("says the assignment has not started while nobody is in a room", async () => {
      data = {
        ...base(),
        rooms: [room("r1", "Room A", 4), room("r2", "Room B", 1)],
      }
      renderCard()
      expect(await screen.findByText("Room assignment has not started yet")).toBeInTheDocument()
    })

    it("says the rules are followed when there is no warning", async () => {
      renderCard()
      expect(await screen.findByText("The assignment follows the room rules")).toBeInTheDocument()
      expect(screen.getByText("All 2 confirmed participants have a bed.")).toBeInTheDocument()
    })

    it("counts the broken rules and the confirmed without a bed, and marks the room", async () => {
      overcrowded()
      renderCard()
      expect(await screen.findByText("Room rules summary")).toBeInTheDocument()
      expect(screen.getByText("rule broken")).toBeInTheDocument()
      expect(screen.getByText("confirmed without a bed")).toBeInTheDocument()
      const table = screen.getByRole("table")
      expect(
        within(table).getByText("Overcrowded room: 2 participants for 1 bed."),
      ).toBeInTheDocument()
      expect(within(table).getByText("Overcrowded")).toBeInTheDocument()
    })

    it("confirms a warning with a note the organizer types", async () => {
      overcrowded()
      post.mockResolvedValue(undefined)
      const user = renderCard()
      const table = await screen.findByRole("table")
      await user.click(within(table).getByRole("button", { name: "Confirm with a note" }))
      const dialog = await screen.findByRole("dialog", { name: "Confirm the warning" })
      expect(
        within(dialog).getByText("Only the organizers of the event see the note."),
      ).toBeInTheDocument()
      await user.type(within(dialog).getByLabelText("Note"), "Family with a child")
      await user.click(within(dialog).getByRole("button", { name: "Confirm the warning" }))
      await waitFor(() => expect(post).toHaveBeenCalled())
      expect(post).toHaveBeenCalledWith(
        "organizer/events/e1/terms/t1/room-warnings/acknowledgements",
        { json: { kind: "OVERCROWDED", roomId: "r2", note: "Family with a child" } },
      )
    })

    it("shows a confirmed warning muted with its note and does not count it", async () => {
      overcrowded()
      data = {
        ...data,
        warnings: [
          warning({
            acknowledged: true,
            note: "Family with a child",
            acknowledgedBy: "Eva Malá",
            acknowledgedAt: "2026-11-12T10:00:00.000Z",
          }),
        ],
        summary: { violations: 0, acknowledged: 1, confirmedWithoutBed: 0 },
      }
      renderCard()
      const table = await screen.findByRole("table")
      expect(within(table).getByText("Overcrowding confirmed")).toBeInTheDocument()
      expect(within(table).getByText("Note: Family with a child")).toBeInTheDocument()
      expect(within(table).getByText(/^Eva Malá, /)).toBeInTheDocument()
      expect(
        within(table).queryByRole("button", { name: "Confirm with a note" }),
      ).not.toBeInTheDocument()
      expect(screen.getByText("The assignment follows the room rules")).toBeInTheDocument()
    })

    it("does not check mixed genders in shared rooms and says so", async () => {
      overcrowded()
      data = { ...data, rooms: data.rooms.map((item) => ({ ...item, gender: null })) }
      renderCard()
      expect(
        await screen.findByText("Mixed genders are not checked in shared rooms."),
      ).toBeInTheDocument()
    })
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
    expect(screen.getByText("Test Osoba09")).toBeInTheDocument()
    expect(screen.queryByText("Test Osoba10")).not.toBeInTheDocument()
    expect(screen.getByText("1–10 / 11")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Next →" }))
    expect(await screen.findByText("Test Osoba10")).toBeInTheDocument()
    expect(screen.queryByText("Test Osoba00")).not.toBeInTheDocument()
  })

  it("searches the unassigned by name once the list is long", async () => {
    data = {
      ...base(),
      unassigned: Array.from({ length: 11 }, (_, index) => ({
        ...person(`u${index}`, "Test", `Osoba${String(index).padStart(2, "0")}`),
        alsoInTerms: [],
      })),
    }
    const user = renderCard()
    const search = await screen.findByRole("searchbox", { name: "Search unassigned participants" })
    await user.type(search, "Osoba10")
    expect(await screen.findByText("Test Osoba10")).toBeInTheDocument()
    expect(screen.queryByText("Test Osoba00")).not.toBeInTheDocument()
    await user.clear(search)
    await user.type(search, "zzz")
    expect(await screen.findByText("No participant with this name.")).toBeInTheDocument()
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
    expect(screen.getByText("The assignment follows the room rules")).toBeInTheDocument()
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
