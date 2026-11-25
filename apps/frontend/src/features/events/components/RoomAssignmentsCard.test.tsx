import * as Dnd from "@dnd-kit/core"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  act,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { RoomAssignments, RoomWarning } from "@/features/events/api/room-assignments"
import { RoomAssignmentsCard } from "@/features/events/components/RoomAssignmentsCard"

// jsdom has no layout, so a drag is driven through the handlers the card gives to the context.
const { dnd } = vi.hoisted(() => ({
  dnd: {
    props: null as null | {
      onDragStart: (e: unknown) => void
      onDragEnd: (e: unknown) => void
      sensors: { sensor: unknown; options: unknown }[]
    },
  },
}))
vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof Dnd>()
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
  accommodationRequest: null,
  status: status as "CONFIRMED" | "TO_EVALUATE",
  wishes: [],
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
  rooms: [{ id: "r3-t2", name: "Room C", gender: "FEMALE" as const, beds: 3, freeBeds: 2 }],
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
let client = new QueryClient()
const term = { eventId: "e1", termId: "t1", startsOn: "2027-07-12", endsOn: "2027-07-18" }

function renderCard() {
  get.mockImplementation(() => ({ json: () => Promise.resolve(data) }))
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
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

  it("offers rooms of the participant's gender with the most free beds first in the dialog", async () => {
    data = {
      ...base(),
      rooms: [
        { ...room("r1", "Room A", 2, [person("p1", "Jana", "Nováková")]), gender: "MALE" as const },
        { ...room("r2", "Room B", 1, [person("p2", "Eva", "Horká")]), gender: "FEMALE" as const },
        { ...room("r3", "Room C", 3), gender: "FEMALE" as const },
        { ...room("r4", "Room D", 4), gender: "MALE" as const },
        { ...room("r5", "Room E", 5), gender: "FEMALE" as const },
      ],
    }
    const user = renderCard()
    await user.click(await screen.findByRole("button", { name: "Assign Nikola Králová to a room" }))
    const dialog = await screen.findByRole("dialog")
    const names = within(dialog)
      .getAllByRole("radio")
      .map((radio) => /Room [A-E]/.exec(radio.closest("label")?.textContent ?? "")?.[0])
    expect(names).toEqual(["Room E", "Room C", "Room B", "Room D", "Room A"])
  })

  it("lists the unassigned with their status, the rooms with people and free beds, and the count", async () => {
    const user = renderCard()
    expect(await screen.findByText("Barbora Šimková")).toBeInTheDocument()
    expect(screen.getByText("Woman · Confirmed")).toBeInTheDocument()
    expect(screen.getByText("Woman · Awaiting evaluation")).toBeInTheDocument()
    expect(screen.getByLabelText("Unassigned participants: 2")).toHaveTextContent("2")
    const table = screen.getByRole("table")
    const roomA = within(table).getByRole("row", { name: /Room A/ })
    expect(within(roomA).queryByText("Jana Nováková")).not.toBeInTheDocument()
    await user.click(within(roomA).getByRole("button", { name: "Participants" }))
    expect(within(roomA).getByText("Jana Nováková")).toBeVisible()
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

  it("keeps the room table inside its column: the panel sits beside it only from xl, the table starts at lg", async () => {
    renderCard()
    await screen.findByText("Barbora Šimková")
    // jsdom has no layout, so this guards the breakpoints that stop the table overflowing (1280 px and 1024 px).
    const table = screen.getByRole("table")
    expect(table.closest(".lg\\:block")).not.toBeNull()
    const row = table.closest(".xl\\:flex-row")
    expect(row).not.toBeNull()
    expect(row).not.toHaveClass("md:flex-row")
    expect(
      within(row as HTMLElement)
        .getByLabelText("Unassigned participants: 2")
        .closest(".xl\\:w-72"),
    ).not.toBeNull()
  })

  it("keeps Assign inactive until a room is picked, then shows what is confirmed (#536)", async () => {
    const user = renderCard()
    await user.click(await screen.findByRole("button", { name: "Assign Nikola Králová to a room" }))
    const dialog = await screen.findByRole("dialog")
    const assign = within(dialog).getByRole("button", { name: "Assign" })
    expect(assign).toBeDisabled()
    expect(within(dialog).getByText("No room selected yet.")).toBeInTheDocument()
    await user.click(within(dialog).getByRole("radio", { name: /Room C/ }))
    expect(assign).toBeEnabled()
    expect(within(dialog).getByText("Room C · 3 free beds")).toBeInTheDocument()
    expect(put).not.toHaveBeenCalled()
  })

  it.each([
    ["desktop", 1280],
    ["360 px", 360],
  ])("scrolls only the room list of 25 rooms, the bar stays (#536, %s)", async (_name, width) => {
    window.innerWidth = width
    data = {
      ...base(),
      rooms: Array.from({ length: 25 }, (_, i) => room(`r${i + 10}`, `Room ${i + 10}`, 3)),
    }
    const user = renderCard()
    await user.click(await screen.findByRole("button", { name: "Assign Nikola Králová to a room" }))
    const dialog = await screen.findByRole("dialog")
    const radios = within(dialog).getAllByRole("radio")
    expect(radios).toHaveLength(25)
    const list = radios[0]!.closest(".overflow-y-auto")
    expect(list).not.toBeNull()
    for (const radio of radios) expect(list).toContainElement(radio)
    for (const name of ["Cancel", "Assign"]) {
      expect(list).not.toContainElement(within(dialog).getByRole("button", { name }))
    }
    expect(within(dialog).getByRole("button", { name: "Assign" })).toBeDisabled()
    await user.click(within(dialog).getByRole("radio", { name: /Room 28/ }))
    expect(within(dialog).getByRole("button", { name: "Assign" })).toBeEnabled()
    expect(within(dialog).getByText(/Room \d+ · 3 free beds/)).toBeInTheDocument()
  })

  describe("a participant in more terms (#539)", () => {
    const openBarbora = async (roomName: RegExp) => {
      const user = renderCard()
      await user.click(
        await screen.findByRole("button", { name: "Assign Barbora Šimková to a room" }),
      )
      const dialog = await screen.findByRole("dialog")
      await user.click(within(dialog).getByRole("radio", { name: roomName }))
      return { user, dialog }
    }
    const withOtherRooms = (
      rooms: { id: string; name: string; beds: number; freeBeds: number }[],
    ) => {
      data = {
        ...base(),
        unassigned: [
          {
            ...person("p3", "Barbora", "Šimková"),
            alsoInTerms: [
              { ...otherTerm, rooms: rooms.map((r) => ({ ...r, gender: "FEMALE" as const })) },
            ],
          },
        ],
      }
    }

    it("ticks the other term where the room has a free bed and assigns both in one step", async () => {
      const { user, dialog } = await openBarbora(/Room C/)
      const checkbox = await within(dialog).findByRole("checkbox", {
        name: /same room in the term .*Room C/,
      })
      expect(checkbox).toBeChecked()
      expect(within(dialog).getByText(/will be in Room C in both terms/)).toBeInTheDocument()
      await user.click(within(dialog).getByRole("button", { name: "Assign" }))
      await waitFor(() => expect(put).toHaveBeenCalled())
      expect(put).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p3", {
        json: { roomId: "r3", alsoTermIds: ["t2"] },
      })
    })

    it("assigns only this term after the tick is removed, and the summary follows", async () => {
      const { user, dialog } = await openBarbora(/Room C/)
      await user.click(
        await within(dialog).findByRole("checkbox", { name: /same room in the term/ }),
      )
      expect(within(dialog).queryByText(/in both terms/)).not.toBeInTheDocument()
      expect(
        within(dialog).getByText(
          "After saving, Barbora Šimková will be in Room C and disappear from the unassigned.",
        ),
      ).toBeInTheDocument()
      await user.click(within(dialog).getByRole("button", { name: "Assign" }))
      await waitFor(() => expect(put).toHaveBeenCalled())
      expect(put).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p3", {
        json: { roomId: "r3", alsoTermIds: [] },
      })
    })

    it("recomputes the offer when another room is picked", async () => {
      const { user, dialog } = await openBarbora(/Room C/)
      await user.click(
        await within(dialog).findByRole("checkbox", { name: /same room in the term/ }),
      )
      await user.click(within(dialog).getByRole("radio", { name: /Room A/ }))
      expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument()
      await user.click(within(dialog).getByRole("radio", { name: /Room C/ }))
      expect(
        await within(dialog).findByRole("checkbox", { name: /same room in the term/ }),
      ).toBeChecked()
    })

    it("says why a term is not offered when it has no room of that name", async () => {
      const { dialog } = await openBarbora(/Room A/)
      expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument()
      expect(
        await within(dialog).findByText(
          /no room with the same name in the term .*stays unassigned/,
        ),
      ).toBeInTheDocument()
    })

    it("offers a full room of the other term unticked and goes on to the extra bed dialog when ticked", async () => {
      withOtherRooms([{ id: "r3-t2", name: "Room C", beds: 3, freeBeds: 0 }])
      const { user, dialog } = await openBarbora(/Room C/)
      const checkbox = await within(dialog).findByRole("checkbox", {
        name: /Room C.*extra bed will be added/,
      })
      expect(checkbox).toBeEnabled()
      expect(checkbox).not.toBeChecked()
      expect(within(dialog).getByRole("button", { name: "Assign" })).toBeEnabled()
      await user.click(checkbox)
      expect(within(dialog).getByText(/An extra bed will be added in the term/)).toBeInTheDocument()
      await user.click(within(dialog).getByRole("button", { name: "Continue" }))
      expect(put).not.toHaveBeenCalled()
      const confirm = await screen.findByRole("dialog", { name: "Room C: add an extra bed" })
      const boxes = within(confirm).getAllByRole("checkbox")
      expect(boxes).toHaveLength(2)
      expect(boxes[0]!).toBeDisabled()
      expect(boxes[1]!).toBeChecked()
      await user.click(within(confirm).getByRole("button", { name: "Assign as an extra bed" }))
      await waitFor(() => expect(put).toHaveBeenCalled())
      expect(put).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p3", {
        json: { roomId: "r3", alsoTermIds: ["t2"], confirmExtraBed: true },
      })
    })
  })

  describe("the extra bed in every term of the participant (#540)", () => {
    const fullEverywhere = (otherRooms: { name: string; beds: number; freeBeds: number }[]) => {
      data = {
        ...base(),
        unassigned: [
          {
            ...person("p3", "Barbora", "Šimková"),
            alsoInTerms: [
              {
                ...otherTerm,
                rooms: otherRooms.map((r, i) => ({
                  ...r,
                  id: `x${i}-t2`,
                  gender: "FEMALE" as const,
                })),
              },
            ],
          },
        ],
      }
    }
    const dropOnRoomB = async () => {
      const user = renderCard()
      await screen.findByText("Barbora Šimková")
      drop(dragFrom("p3", "Barbora Šimková", null), "r2")
      return {
        user,
        dialog: await screen.findByRole("dialog", { name: "Room B: add an extra bed" }),
      }
    }

    it("adds the extra bed in both terms when the room is full in both", async () => {
      fullEverywhere([{ name: "Room B", beds: 1, freeBeds: 0 }])
      const { user, dialog } = await dropOnRoomB()
      expect(within(dialog).getAllByText("Extra bed +1")).toHaveLength(2)
      expect(within(dialog).getAllByText("Beds after assigning: 1 + 1 extra bed")).toHaveLength(2)
      expect(
        within(dialog).getByText(/in both terms, with an extra bed in both/),
      ).toBeInTheDocument()
      const boxes = within(dialog).getAllByRole("checkbox")
      expect(boxes[0]!).toBeDisabled()
      expect(boxes[1]!).toBeChecked()
      await user.click(within(dialog).getByRole("button", { name: "Assign as an extra bed" }))
      await waitFor(() => expect(put).toHaveBeenCalled())
      expect(put).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p3", {
        json: { roomId: "r2", alsoTermIds: ["t2"], confirmExtraBed: true },
      })
    })

    it("opens with every term of the participant when Assign picks a room that is full here (button)", async () => {
      fullEverywhere([{ name: "Room B", beds: 1, freeBeds: 0 }])
      const user = renderCard()
      await user.click(
        await screen.findByRole("button", { name: "Assign Barbora Šimková to a room" }),
      )
      const picker = await screen.findByRole("dialog")
      await user.click(within(picker).getByRole("radio", { name: /Room B/ }))
      await user.click(within(picker).getByRole("button", { name: "Assign" }))
      const dialog = await screen.findByRole("dialog", { name: "Room B: add an extra bed" })
      expect(within(dialog).getAllByRole("checkbox")).toHaveLength(2)
      await user.click(within(dialog).getByRole("button", { name: "Assign as an extra bed" }))
      await waitFor(() => expect(put).toHaveBeenCalled())
      expect(put).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p3", {
        json: { roomId: "r2", alsoTermIds: ["t2"], confirmExtraBed: true },
      })
    })

    it("names the terms with an extra bed when only some of three placed terms get one", async () => {
      const third = {
        ...otherTerm,
        termId: "t3",
        startsOn: "2027-07-26",
        endsOn: "2027-08-01",
      }
      data = {
        ...base(),
        unassigned: [
          {
            ...person("p3", "Barbora", "Šimková"),
            alsoInTerms: [
              {
                ...otherTerm,
                rooms: [{ id: "b-t2", name: "Room B", gender: "FEMALE", beds: 3, freeBeds: 2 }],
              },
              {
                ...third,
                rooms: [{ id: "b-t3", name: "Room B", gender: "FEMALE", beds: 1, freeBeds: 0 }],
              },
            ],
          },
        ],
      }
      const user = renderCard()
      await screen.findByText("Barbora Šimková")
      drop(dragFrom("p3", "Barbora Šimková", null), "r2")
      const dialog = await screen.findByRole("dialog", { name: "Room B: add an extra bed" })
      expect(within(dialog).getByText(/with an extra bed in the terms .* and /)).toBeInTheDocument()
      expect(within(dialog).queryByText(/extra bed in both/)).not.toBeInTheDocument()
      await user.click(within(dialog).getByRole("button", { name: "Assign as an extra bed" }))
      await waitFor(() => expect(put).toHaveBeenCalled())
      expect(put).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p3", {
        json: { roomId: "r2", alsoTermIds: ["t2", "t3"], confirmExtraBed: true },
      })
    })

    it("only assigns in the term where the room has a free bed", async () => {
      fullEverywhere([{ name: "Room B", beds: 3, freeBeds: 2 }])
      const { user, dialog } = await dropOnRoomB()
      expect(within(dialog).getAllByText("Extra bed +1")).toHaveLength(1)
      expect(within(dialog).getByText("Free bed")).toBeInTheDocument()
      expect(
        within(dialog).getByText("Assignment only, the room has a free bed"),
      ).toBeInTheDocument()
      expect(within(dialog).getByText(/with an extra bed only in the term/)).toBeInTheDocument()
      await user.click(within(dialog).getByRole("button", { name: "Assign as an extra bed" }))
      await waitFor(() => expect(put).toHaveBeenCalled())
      expect(put).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p3", {
        json: { roomId: "r2", alsoTermIds: ["t2"], confirmExtraBed: true },
      })
    })

    it("leaves out a term the organizer unticks", async () => {
      fullEverywhere([{ name: "Room B", beds: 1, freeBeds: 0 }])
      const { user, dialog } = await dropOnRoomB()
      await user.click(within(dialog).getAllByRole("checkbox")[1]!)
      expect(within(dialog).getByText("Not assigned")).toBeInTheDocument()
      await user.click(within(dialog).getByRole("button", { name: "Assign as an extra bed" }))
      await waitFor(() => expect(put).toHaveBeenCalled())
      expect(put).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p3", {
        json: { roomId: "r2", alsoTermIds: [], confirmExtraBed: true },
      })
    })

    it("skips a term without a room of that name and cannot tick it", async () => {
      fullEverywhere([{ name: "Room Z", beds: 3, freeBeds: 2 }])
      const { user, dialog } = await dropOnRoomB()
      expect(within(dialog).getByText("Skipped")).toBeInTheDocument()
      expect(within(dialog).getAllByRole("checkbox")[1]!).toBeDisabled()
      await user.click(within(dialog).getByRole("button", { name: "Assign as an extra bed" }))
      await waitFor(() => expect(put).toHaveBeenCalled())
      expect(put).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p3", {
        json: { roomId: "r2", alsoTermIds: [], confirmExtraBed: true },
      })
    })

    it("says nothing was saved when a term fails, and keeps the dialog open", async () => {
      fullEverywhere([{ name: "Room B", beds: 1, freeBeds: 0 }])
      put.mockRejectedValue(new Error("No room with the same name."))
      const { user, dialog } = await dropOnRoomB()
      await user.click(within(dialog).getByRole("button", { name: "Assign as an extra bed" }))
      expect(await within(dialog).findByText(/Nothing was saved, in any term/)).toBeInTheDocument()
      expect(screen.getByRole("dialog", { name: "Room B: add an extra bed" })).toBeInTheDocument()
      expect(success).not.toHaveBeenCalled()
    })
  })

  it("moves a person through the menu of their chip, the current room is not a choice", async () => {
    const user = renderCard()
    await screen.findByRole("table")
    const cards = screen.getAllByRole("list").find((list) => list.classList.contains("lg:hidden"))
    const card = within(cards!)
      .getAllByRole("listitem")
      .find((item) => within(item).queryByRole("button", { name: "Actions r1" }))!
    await user.click(within(card).getByRole("button", { name: "Participants" }))
    await user.click(within(card).getByRole("button", { name: "Actions for Jana Nováková" }))
    const sheet = await screen.findByRole("dialog", { name: "Jana Nováková" })
    expect(sheet).toHaveAccessibleDescription(/Room A/)
    await user.click(within(sheet).getByRole("button", { name: "Move to another room…" }))
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
    await screen.findByRole("table")
    const cards = screen.getAllByRole("list").find((list) => list.classList.contains("lg:hidden"))
    const card = within(cards!)
      .getAllByRole("listitem")
      .find((item) => within(item).queryByRole("button", { name: "Actions r2" }))!
    await user.click(within(card).getByRole("button", { name: "Participants" }))
    await user.click(within(card).getByRole("button", { name: "Actions for Eva Horká" }))
    const sheet = await screen.findByRole("dialog", { name: "Eva Horká" })
    await user.click(within(sheet).getByRole("button", { name: "Remove from room" }))
    await waitFor(() =>
      expect(del).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p2"),
    )
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith("Participant has no room again", "Eva Horká"),
    )
  })

  it("lets a touch swipe scroll and cancels a long press drag without changing assignment", async () => {
    renderCard()
    const participant = await screen.findByText("Barbora Šimková")
    const roomRow = screen.getByRole("cell", { name: "Room C" }).closest("tr")
    expect(dnd.props?.sensors).toEqual([
      { sensor: Dnd.MouseSensor, options: { activationConstraint: { distance: 6 } } },
      { sensor: Dnd.TouchSensor, options: { activationConstraint: { delay: 250, tolerance: 8 } } },
    ])

    vi.useFakeTimers()
    try {
      const start = { touches: [{ clientX: 30, clientY: 40 }] }
      fireEvent.touchStart(participant, start)
      const scroll = createEvent.touchMove(participant, {
        touches: [{ clientX: 30, clientY: 80 }],
      })
      fireEvent(participant, scroll)
      act(() => {
        vi.advanceTimersByTime(250)
      })
      expect(scroll.defaultPrevented).toBe(false)
      expect(roomRow).not.toHaveClass("bg-muted")

      fireEvent.touchStart(participant, start)
      act(() => {
        vi.advanceTimersByTime(250)
      })
      expect(roomRow).toHaveClass("bg-muted")

      fireEvent.touchCancel(participant)
      act(() => {
        vi.advanceTimersByTime(50)
      })
      expect(roomRow).not.toHaveClass("bg-muted")
      expect(put).not.toHaveBeenCalled()
      expect(del).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
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
    const saved = new Promise<void>((resolve) => {
      finish = resolve
    })
    put.mockReturnValueOnce(saved)
    renderCard()
    await screen.findByText("Barbora Šimková")
    drop(dragFrom("p3", "Barbora Šimková", null), "r3")
    await waitFor(() => expect(put).toHaveBeenCalled())
    expect(success).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Unassigned participants: 2")).toHaveTextContent("2")
    await act(async () => {
      finish()
      await saved
    })
    await waitFor(() => expect(success).toHaveBeenCalledTimes(1))
  })

  it("asks before a full room takes someone as an extra bed, and cancelling changes nothing", async () => {
    const user = renderCard()
    await screen.findByText("Barbora Šimková")
    drop(dragFrom("p4", "Nikola Králová", null), "r2")
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
    drop(dragFrom("p4", "Nikola Králová", null), "r2")
    const dialog = await screen.findByRole("dialog", { name: "Room B is full" })
    await user.click(within(dialog).getByRole("button", { name: "Assign as an extra bed" }))
    await waitFor(() => expect(put).toHaveBeenCalled())
    expect(put).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p4", {
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
      const user = renderCard()
      expect(await screen.findByText("Barbora Šimková")).toBeInTheDocument()
      expect(screen.getByText("Woman · Awaiting evaluation")).toBeInTheDocument()
      expect(screen.getAllByText("Individual accommodation")).toHaveLength(1)
      const table = screen.getByRole("table")
      const roomA = within(table).getByRole("row", { name: /Room A/ })
      const roomB = within(table).getByRole("row", { name: /Room B/ })
      await user.click(within(roomA).getByRole("button", { name: "Participants" }))
      await user.click(within(roomB).getByRole("button", { name: "Participants" }))
      expect(within(roomA).getByText("Individual")).toBeVisible()
      expect(within(roomB).getByText("Eva Horká")).toBeVisible()
      expect(screen.getByRole("button", { name: "Assign Barbora Šimková to a room" })).toBeEnabled()
    })

    it("shows the note of the request in a tooltip on the badge", async () => {
      data = {
        ...base(),
        unassigned: [
          {
            ...person("p3", "Barbora", "Šimková", "CONFIRMED", true),
            accommodationRequest: "Needs a quiet room near the nurse",
            alsoInTerms: [],
          },
        ],
      }
      const user = renderCard()
      await user.hover(await screen.findByText("Individual accommodation"))
      expect(
        (await screen.findAllByText("Needs a quiet room near the nurse")).length,
      ).toBeGreaterThan(0)
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
      const texts = await screen.findAllByText(
        "Mixed genders: 1 woman and 1 man. Lucie Veselá has individual accommodation and is excluded from the count.",
      )
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
      expect(await screen.findByText("Room rules are followed")).toBeInTheDocument()
    })

    it("counts the broken rules and marks the room", async () => {
      overcrowded()
      renderCard()
      expect(await screen.findByText("rule broken")).toBeInTheDocument()
      expect(screen.queryByText("confirmed without a bed")).not.toBeInTheDocument()
      const table = screen.getByRole("table")
      expect(within(table).getByText("Overcrowded room · Occupancy: 2 / 1.")).toBeInTheDocument()
      expect(within(table).getByText("Overcrowded")).toBeInTheDocument()
    })

    it("confirms a warning with a note the organizer types", async () => {
      overcrowded()
      post.mockResolvedValue(undefined)
      const user = renderCard()
      const table = await screen.findByRole("table")
      await user.click(within(table).getByRole("button", { name: "Confirm with a note" }))
      const dialog = await screen.findByRole("dialog", { name: "Confirm the warning" })
      expect(within(dialog).getByText("Overcrowded · Occupancy: 2 / 1")).toBeVisible()
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

    it("shows a confirmed warning only as a quiet mark with its note in a tooltip and does not count it", async () => {
      const user = userEvent.setup()
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
      // No strip with text: just a small mark; the note shows only on hover or focus.
      expect(within(table).queryByText("Note: Family with a child")).not.toBeInTheDocument()
      const mark = within(table).getByRole("button", { name: "Overcrowding confirmed" })
      await user.hover(mark)
      expect((await screen.findAllByText("Note: Family with a child")).length).toBeGreaterThan(0)
      expect(
        within(table).queryByRole("button", { name: "Confirm with a note" }),
      ).not.toBeInTheDocument()
      expect(screen.getByText("Room rules are followed")).toBeInTheDocument()
    })

    it("does not check mixed genders in shared rooms and says so", async () => {
      overcrowded()
      data = { ...data, rooms: data.rooms.map((item) => ({ ...item, gender: null })) }
      renderCard()
      expect(
        await screen.findByText("Mixed genders are not checked in shared rooms."),
      ).toBeInTheDocument()
    })

    // US-145: a gendered term with only individual rooms (no gender) is not a shared-rooms term.
    it("does not call a term with only individual rooms shared", async () => {
      overcrowded()
      data = {
        ...data,
        rooms: data.rooms.map((item) => ({ ...item, gender: null, individual: true })),
      }
      renderCard()
      await screen.findByText("Barbora Šimková")
      expect(
        screen.queryByText("Mixed genders are not checked in shared rooms."),
      ).not.toBeInTheDocument()
    })
  })

  // US-145: an assignment can change the capacity, so the other pages of the event refetch.
  it("marks the rooms, capacity and occupancy of the event stale after an assignment", async () => {
    renderCard()
    await screen.findByText("Barbora Šimková")
    const keys = [
      ["events", "e1", "rooms", "t1"],
      ["events", "e1", "capacity"],
      ["events", "e1", "occupancy"],
    ]
    for (const key of keys) client.setQueryData(key, {})
    drop(dragFrom("p1", "Jana Nováková", "r1"), "r3")
    await waitFor(() => expect(put).toHaveBeenCalled())
    await waitFor(() => {
      for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true)
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

  it("removes a person from the room by dropping their chip on the unassigned panel", async () => {
    renderCard()
    await screen.findByText("Barbora Šimková")
    const from = dragFrom("p1", "Jana Nováková", "r1")
    act(() => dnd.props?.onDragStart(from))
    act(() =>
      dnd.props?.onDragEnd({ ...from, over: { data: { current: { isUnassigned: true } } } }),
    )
    await waitFor(() =>
      expect(del).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p1"),
    )
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith("Participant has no room again", "Jana Nováková"),
    )
  })

  it("ignores an unassigned person dropped back on the unassigned panel", async () => {
    renderCard()
    await screen.findByText("Barbora Šimková")
    const from = dragFrom("p3", "Barbora Šimková", null)
    act(() => dnd.props?.onDragStart(from))
    act(() =>
      dnd.props?.onDragEnd({ ...from, over: { data: { current: { isUnassigned: true } } } }),
    )
    expect(del).not.toHaveBeenCalled()
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
    await user.click(screen.getByRole("button", { name: "Next page" }))
    expect(await screen.findByText("Test Osoba10")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled()
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
    let notify: (
      entries: { isIntersecting: boolean; boundingClientRect: { bottom: number } }[],
    ) => void = () => undefined
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
    expect(screen.getByText("Room rules are followed")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Actions r1" }).length).toBe(2)
    expect(
      screen.queryByRole("status", { name: "Unassigned participants" }),
    ).not.toBeInTheDocument()
    act(() => notify([{ isIntersecting: false, boundingClientRect: { bottom: -10 } }]))
    expect(
      await screen.findByRole("status", { name: "Unassigned participants" }),
    ).toHaveTextContent("Unassigned participants2")
    vi.unstubAllGlobals()
  })
})
