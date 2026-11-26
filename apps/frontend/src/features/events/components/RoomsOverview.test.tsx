import type * as Dnd from "@dnd-kit/core"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { RoomAssignments, RoomWarning } from "@/features/events/api/room-assignments"
import type { TermRooms } from "@/features/events/api/rooms"
import { RoomsOverview } from "@/features/events/components/RoomsOverview"

const { get, put, del } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), del: vi.fn() }))
vi.mock("@/lib/api-client", () => ({
  api: { get, put, delete: del },
  apiErrorCode: () => undefined,
}))

// jsdom has no layout, so a drag is driven through the handlers the view gives to the context.
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

const LONG_NAME = "Maximiliána Alexandra Hohenlohe-Schillingsfürstová"

const person = (
  id: string,
  firstName: string,
  lastName: string,
  over: { status?: "CONFIRMED" | "TO_EVALUATE"; individual?: boolean; year?: number } = {},
) => ({
  applicationTermId: id,
  applicationId: `a-${id}`,
  firstName,
  lastName,
  birthYear: over.year ?? 2011,
  gender: "FEMALE" as const,
  individualAccommodation: over.individual ?? false,
  accommodationRequest: null,
  status: over.status ?? ("CONFIRMED" as const),
  wishes: [],
})
const room = (
  id: string,
  name: string,
  capacity: number,
  participants: ReturnType<typeof person>[] = [],
  extraBeds = 0,
  gender: "FEMALE" | "MALE" | null = "FEMALE",
  isIndividual = false,
) => ({
  id,
  name,
  capacity,
  extraBeds,
  beds: capacity + extraBeds,
  gender,
  individual: isIndividual,
  participants,
})
const warning = (over: Partial<RoomWarning> = {}): RoomWarning => ({
  kind: "OVERCROWDED",
  roomId: "r2",
  applicationTermId: null,
  acknowledged: false,
  note: null,
  acknowledgedAt: null,
  acknowledgedBy: null,
  ...over,
})
const base = (): RoomAssignments => ({
  eventId: "e1",
  termId: "t1",
  rooms: [
    room("r1", "Room A", 4, [
      person("p1", "Jana", "Nováková", { year: 2011 }),
      person("p2", "Eva", "Horká", { status: "TO_EVALUATE", year: 2010 }),
    ]),
    room("r2", "Room B", 2, [person("p3", "Karel", "Procházka", { year: 2012 })], 1, "MALE"),
  ],
  unassigned: [
    { ...person("p4", "Barbora", "Šimková", { year: 2012 }), alsoInTerms: [] },
    { ...person("p5", "Nikola", "Králová", { status: "TO_EVALUATE" }), alsoInTerms: [] },
  ],
  warnings: [],
  summary: { violations: 0, acknowledged: 0, confirmedWithoutBed: 0 },
})
const term: TermRooms = {
  eventId: "e1",
  eventName: "Summer camp",
  organizationName: "Camp",
  organizationContactEmail: null,
  termId: "t1",
  termName: "Week 1",
  startsOn: "2027-07-12",
  endsOn: "2027-07-18",
  roomMode: "GENDERED",
  rooms: [],
  capacity: { FEMALE: 0, MALE: 0, total: 0 },
} as unknown as TermRooms

let data = base()
const onShowAssignment = vi.fn()
const onEditExtraBeds = vi.fn()

function renderOverview(isPrintOnly = false) {
  get.mockImplementation(() => ({ json: () => Promise.resolve(data) }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <RoomsOverview
        term={term}
        isPrintOnly={isPrintOnly}
        onShowAssignment={onShowAssignment}
        onEditExtraBeds={onEditExtraBeds}
      />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}
/** The summary cards on screen (the print header has its own list with the same labels). */
const summaryList = (): HTMLElement =>
  screen
    .getAllByText("Rooms")
    .map((label) => label.closest("dl"))
    .find((list) => list?.classList.contains("md:grid-cols-4"))!
const roomCard = async (name: string) =>
  (await screen.findByRole("heading", { name, level: 3 })).closest("li") as HTMLElement

beforeEach(() => {
  data = base()
  get.mockReset()
  onShowAssignment.mockReset()
  onEditExtraBeds.mockReset()
  del.mockReset()
  put.mockReset()
  put.mockResolvedValue(undefined)
  del.mockResolvedValue(undefined)
})
afterEach(() => vi.unstubAllGlobals())

describe("RoomsOverview (US-36)", () => {
  // US-145: the organizer sees where everybody sleeps, the individual room is marked.
  it("shows an individual room with its people and a label instead of a gender", async () => {
    data.rooms.push(
      room(
        "r3",
        "Family room",
        4,
        [person("p6", "Petra", "Rodinná"), person("p7", "Pavel", "Rodinný")],
        0,
        null,
        true,
      ),
    )
    renderOverview()
    const family = within(await roomCard("Family room"))
    expect(family.getByText("Petra Rodinná")).toBeInTheDocument()
    expect(family.getByText("Pavel Rodinný")).toBeInTheDocument()
    expect(family.getByText("2 / 4")).toBeInTheDocument()
    expect(family.getByText("Individual")).toBeInTheDocument()
    expect(family.queryByText("Mixed")).not.toBeInTheDocument()
  })

  it("lists every room with its people, birth years, free beds and extra beds (AC1, AC2)", async () => {
    renderOverview()
    const a = within(await roomCard("Room A"))
    expect(a.getByText("2 / 4")).toBeInTheDocument()
    expect(a.getByText("2 free beds")).toBeInTheDocument()
    expect(
      a.getByRole("button", { name: "Beds · Room A · Eva Horká +1" }),
    ).toHaveTextContent("Eva Horká +1")
    expect(a.getByText("Eva Horká")).toBeInTheDocument()
    expect(a.getByText("b. 2010")).toBeInTheDocument()
    expect(a.getByText("Jana Nováková")).toBeInTheDocument()
    expect(a.getByText("b. 2011")).toBeInTheDocument()
    expect(a.getAllByText("Free bed")).toHaveLength(2)
    // The one still to evaluate is marked.
    expect(a.getAllByText("Awaiting evaluation")).toHaveLength(1)

    const b = within(await roomCard("Room B"))
    expect(b.getByText("1 / 3")).toBeInTheDocument()
    // A quiet chip in the title row, not a row of its own (#542).
    expect(b.getByText("Extra bed +1").parentElement).toContainElement(
      b.getByRole("heading", { name: "Room B" }),
    )
    // Beds above the capacity are extra beds; the last of three beds is the extra one.
    expect(b.getAllByText("Extra bed")).toHaveLength(1)
    expect(b.getAllByText("Free bed")).toHaveLength(2)
  })

  it("sums rooms, beds, occupied and free beds", async () => {
    renderOverview()
    await roomCard("Room A")
    const summary = summaryList()
    const values = within(summary)
      .getAllByRole("definition")
      .map((item) => item.textContent)
    expect(values).toEqual(["2", "7", "including 1 extra bed", "3", "4"])
  })

  it("lists only the confirmed people without a room at the end (2a)", async () => {
    renderOverview()
    const heading = await screen.findByRole("heading", { name: "Confirmed without a room" })
    const list = heading.parentElement!.parentElement!
    expect(within(list).getByText("Barbora Šimková")).toBeInTheDocument()
    expect(within(list).getByText("b. 2012")).toBeInTheDocument()
    expect(within(list).queryByText("Nikola Králová")).not.toBeInTheDocument()
  })

  it("never shows individual accommodation (D-161)", async () => {
    data.rooms[0]!.participants[0] = person("p1", "Jana", "Nováková", { individual: true })
    data.unassigned[0] = {
      ...person("p4", "Barbora", "Šimková", { individual: true }),
      alsoInTerms: [],
    }
    renderOverview()
    await roomCard("Room A")
    expect(screen.getByText("Jana Nováková")).toBeInTheDocument()
    // The rooms never show it; the list of the unassigned labels it as in the assignment.
    for (const name of ["Room A", "Room B"]) {
      expect((await roomCard(name)).textContent).not.toMatch(/individual/i)
    }
  })

  it("tells the shared rooms from the gendered ones", async () => {
    data.rooms = [room("r1", "Room A", 3, [], 0, null), room("r2", "Room B", 3, [], 0, "MALE")]
    renderOverview()
    expect(within(await roomCard("Room A")).getByText("Mixed")).toBeInTheDocument()
    expect(within(await roomCard("Room B")).getByText("Men's")).toBeInTheDocument()
  })

  it("shows every bed free when nobody is assigned", async () => {
    data.rooms = [room("r1", "Room A", 3), room("r2", "Room B", 2)]
    renderOverview()
    const a = within(await roomCard("Room A"))
    expect(
      a.getByRole("button", { name: "Beds · Room A · Free beds: 3" }),
    ).toHaveTextContent("Free beds: 3")
    expect(a.getAllByText("Free bed")).toHaveLength(3)
    expect(screen.getAllByText("Free bed")).toHaveLength(5)
  })

  it("says Full and hides the list of people without a room when everyone sleeps somewhere", async () => {
    data.rooms = [room("r1", "Room A", 1, [person("p1", "Jana", "Nováková")])]
    data.unassigned = []
    renderOverview()
    expect(within(await roomCard("Room A")).getByText("Full")).toBeInTheDocument()
    expect(screen.queryByText("Confirmed without a room")).not.toBeInTheDocument()
  })

  it("offers adding rooms for a term without rooms and cannot print", async () => {
    data.rooms = []
    data.unassigned = []
    const user = renderOverview()
    expect(await screen.findByText("Rooms of this term will appear here.")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Go to Assignment" }))
    expect(onShowAssignment).toHaveBeenCalledOnce()
  })

  it("shows an open room warning in the card with the confirm button of the assignment (#542)", async () => {
    data.warnings = [warning()]
    data.summary = { violations: 1, acknowledged: 0, confirmedWithoutBed: 0 }
    const user = renderOverview()
    const card = within(await roomCard("Room B"))
    expect(card.getByText(/Overcrowded room/)).toBeInTheDocument()
    await user.click(card.getByRole("button", { name: "Confirm with a note" }))
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
  })

  it("shows a confirmed warning as an icon in the header of the room with its note in a tooltip", async () => {
    data.warnings = [
      warning({
        acknowledged: true,
        note: "Family with a child",
        acknowledgedBy: "Eva Malá",
        acknowledgedAt: "2026-11-12T10:00:00.000Z",
      }),
    ]
    const user = renderOverview()
    const card = within(await roomCard("Room B"))
    const mark = card.getByRole("button", { name: "Overcrowding confirmed" })
    // In the title row with the name, not in a strip of its own.
    expect(mark.parentElement).toContainElement(card.getByRole("heading", { name: "Room B" }))
    expect(card.queryByText("Note: Family with a child")).not.toBeInTheDocument()
    await user.hover(mark)
    expect((await screen.findAllByText("Note: Family with a child")).length).toBeGreaterThan(0)
  })

  it("has no warning strip when only people without a bed are warned about", async () => {
    data.warnings = [
      warning({ kind: "CONFIRMED_WITHOUT_BED", roomId: null, applicationTermId: "p4" }),
    ]
    data.summary = { violations: 0, acknowledged: 0, confirmedWithoutBed: 1 }
    renderOverview()
    await roomCard("Room A")
    expect(screen.queryByRole("button", { name: "Confirm with a note" })).not.toBeInTheDocument()
  })

  it("has no print button of its own: printing sits in the bar of the rooms page", async () => {
    renderOverview()
    await roomCard("Room A")
    expect(screen.queryByRole("button", { name: "Print overview" })).not.toBeInTheDocument()
  })

  describe("controls (#542)", () => {
    it("assigns a person without a room with the same dialog as the assignment", async () => {
      const user = renderOverview()
      await roomCard("Room A")
      await user.click(screen.getByRole("button", { name: "Assign Barbora Šimková to a room" }))
      const dialog = await screen.findByRole("dialog", { name: "Assign a participant to a room" })
      expect(within(dialog).getByText("Barbora Šimková")).toBeInTheDocument()
    })

    it("moves a person from the menu with the same dialog as the assignment", async () => {
      const user = renderOverview()
      const card = within(await roomCard("Room A"))
      await user.click(card.getByRole("button", { name: "Beds · Room A · Eva Horká +1" }))
      await user.click(card.getByRole("button", { name: "Actions for Jana Nováková" }))
      await user.click(await screen.findByRole("menuitem", { name: "Move to another room…" }))
      expect(
        await screen.findByRole("dialog", { name: "Move the participant to another room" }),
      ).toBeInTheDocument()
    })

    it("removes a person from the room and reads the assignments again", async () => {
      del.mockReturnValue(Promise.resolve({}))
      const user = renderOverview()
      const card = within(await roomCard("Room A"))
      await user.click(card.getByRole("button", { name: "Beds · Room A · Eva Horká +1" }))
      await user.click(card.getByRole("button", { name: "Actions for Jana Nováková" }))
      await user.click(await screen.findByRole("menuitem", { name: "Remove from room" }))
      await vi.waitFor(() => expect(del).toHaveBeenCalledOnce())
      // The event's queries are invalidated, so the change shows at once in both views.
      await vi.waitFor(() => expect(get.mock.calls.length).toBeGreaterThan(1))
    })

    it("opens the extra-beds dialog of the page from the room header", async () => {
      const user = renderOverview()
      await user.click(
        within(await roomCard("Room B")).getByRole("button", {
          name: "Edit extra beds (1) – Room B",
        }),
      )
      expect(onEditExtraBeds).toHaveBeenCalledWith("r2")
      await user.click(
        within(await roomCard("Room A")).getByRole("button", { name: "Add an extra bed – Room A" }),
      )
      expect(onEditExtraBeds).toHaveBeenLastCalledWith("r1")
    })

    const dragFrom = (applicationTermId: string, name: string, fromRoomId: string | null) => ({
      active: { data: { current: { applicationTermId, name, fromRoomId } } },
    })
    const dropOnRoom = (from: ReturnType<typeof dragFrom>, roomId: string) => {
      act(() => dnd.props?.onDragStart(from))
      act(() => dnd.props?.onDragEnd({ ...from, over: { data: { current: { roomId } } } }))
    }

    it("lets a person be dragged from one room to another like in the assignment", async () => {
      renderOverview()
      await roomCard("Room A")
      dropOnRoom(dragFrom("p1", "Jana Nováková", "r1"), "r2")
      await waitFor(() => expect(put).toHaveBeenCalled())
      expect(put).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p1", {
        json: { roomId: "r2", alsoTermIds: [] },
      })
    })

    it("lets a person without a room be dragged onto a room", async () => {
      renderOverview()
      await roomCard("Room A")
      dropOnRoom(dragFrom("p4", "Barbora Šimková", null), "r1")
      await waitFor(() => expect(put).toHaveBeenCalled())
      expect(put).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments/p4", {
        json: { roomId: "r1", alsoTermIds: [] },
      })
    })

    it("removes a person from the room when they are dropped on the unassigned", async () => {
      renderOverview()
      await roomCard("Room A")
      act(() => dnd.props?.onDragStart(dragFrom("p1", "Jana Nováková", "r1")))
      act(() =>
        dnd.props?.onDragEnd({
          ...dragFrom("p1", "Jana Nováková", "r1"),
          over: { data: { current: { isUnassigned: true } } },
        }),
      )
      await waitFor(() => expect(del).toHaveBeenCalledOnce())
    })

    it("gives every person in a room a handle to drag", async () => {
      renderOverview()
      const card = within(await roomCard("Room A"))
      const handle = card.getByText("Jana Nováková").closest("[aria-roledescription=draggable]")
      expect(handle).not.toBeNull()
    })

    it("lists all the unassigned people in a full-width section with search, like the assignment", async () => {
      data.unassigned = Array.from({ length: 12 }, (_, index) => ({
        ...person(`u${index}`, `Name${index}`, "Unassigned"),
        alsoInTerms: [],
      }))
      const user = renderOverview()
      await roomCard("Room A")
      const panel = screen
        .getByRole("heading", { name: "Unassigned participants" })
        .closest("div[class*=rounded-lg]")!
      // All twelve at once, no paging; the search narrows them.
      expect(
        within(panel as HTMLElement).getAllByRole("button", { name: /^Assign / }),
      ).toHaveLength(12)
      await user.type(
        screen.getByRole("searchbox", { name: "Search unassigned participants" }),
        "Name11",
      )
      expect(
        within(panel as HTMLElement).getAllByRole("button", { name: /^Assign / }),
      ).toHaveLength(1)
    })

    it("hides every control from the paper", async () => {
      renderOverview()
      await roomCard("Room A")
      const area = document.querySelector<HTMLElement>("[data-print-area]")!
      const clickable = within(area)
        .getAllByRole("button")
        .filter((button) => button.getAttribute("aria-roledescription") !== "draggable")
      for (const button of clickable) {
        expect(button.closest(".print\\:hidden")).not.toBeNull()
      }
    })

    it("renders the print sheet without any control and hidden on screen", async () => {
      renderOverview(true)
      await roomCard("Room A")
      const area = document.querySelector<HTMLElement>("[data-print-area]")!
      expect(area).toHaveClass("hidden", "print:flex")
      expect(within(area).queryAllByRole("button")).toHaveLength(0)
    })
  })

  it("puts the to-evaluate label next to the name, not into the year of birth", async () => {
    renderOverview()
    const card = within(await roomCard("Room A"))
    const label = card.getByText("Awaiting evaluation")
    const name = card.getByText("Eva Horká")
    expect(label.parentElement).toBe(name.parentElement)
    expect(label.parentElement).not.toContainElement(card.getByText("b. 2010"))
  })

  it("lists who is without a room with gender and status", async () => {
    renderOverview()
    const heading = await screen.findByRole("heading", { name: "Confirmed without a room" })
    expect(
      within(heading.parentElement!.parentElement!).getByText("Woman · Confirmed"),
    ).toBeInTheDocument()
  })

  describe("print (AC3)", () => {
    it("hides the toolbar, the summary and the buttons from the paper", async () => {
      renderOverview()
      await roomCard("Room A")
      expect(summaryList()).toHaveClass("print:hidden")
      // Nothing that is clicked is printed: every button sits inside the hidden toolbar.
      for (const button of screen
        .getAllByRole("button")
        .filter((item) => item.getAttribute("aria-roledescription") !== "draggable")) {
        expect(button.closest(".print\\:hidden")).not.toBeNull()
      }
    })

    it("prints only the overview, with a header of the event, the term and the date", async () => {
      renderOverview()
      await roomCard("Room A")
      const area = document.querySelector<HTMLElement>("[data-print-area]")!
      expect(area).not.toBeNull()
      expect(
        within(area).getByRole("heading", { name: "Summer camp", level: 2 }),
      ).toBeInTheDocument()
      // The basic facts in a row: term, rooms, beds, occupied, free beds.
      const facts = within(area)
        .getAllByRole("term")
        .filter((item) => item.closest(".print\\:flex") !== null)
        .map((item) => `${item.textContent}: ${item.nextElementSibling?.textContent}`)
      expect(facts[0]).toMatch(/^Term: .*Week 1$/)
      expect(facts.slice(1)).toEqual(["Rooms: 2", "Beds: 7", "Occupied: 3", "Free beds: 4"])
      expect(area.textContent).toMatch(/Printed /)
    })

    it("keeps a room on one page, in two columns", async () => {
      renderOverview()
      const item = await roomCard("Room A")
      expect(item).toHaveClass("print:break-inside-avoid")
      expect(item.parentElement).toHaveClass("print:columns-2")
      expect(item.parentElement).not.toHaveClass("print:grid-cols-2")
    })

    it("splits a room longer than a page only between bed rows, with the header repeated", async () => {
      data.rooms[0]!.beds = 45
      data.rooms[0]!.capacity = 45
      renderOverview()
      const item = await roomCard("Room A")
      // The room takes the whole width and has no page-avoid of its own, its pieces have.
      expect(item).toHaveClass("print:[column-span:all]")
      expect(item).not.toHaveClass("print:break-inside-avoid")
      const pieces = [...item.firstElementChild!.children].filter((child) =>
        child.classList.contains("print:break-inside-avoid"),
      )
      expect(pieces).toHaveLength(3)
      // The 20 + 20 + 5 beds; every piece after the first starts with the repeated header.
      expect(pieces.map((piece) => piece.querySelectorAll("li").length)).toEqual([20, 20, 5])
      expect(pieces[1]!.firstElementChild).toHaveClass("print:flex")
      expect(pieces[1]!.firstElementChild).toHaveTextContent("Room A · continued")
      expect(pieces[2]!.firstElementChild).toHaveTextContent("Room A · continued")
    })

    it("wraps a long name instead of cutting it", async () => {
      data.rooms[0]!.participants[0] = person(
        "p1",
        "Maximiliána Alexandra",
        "Hohenlohe-Schillingsfürstová",
      )
      renderOverview()
      await roomCard("Room A")
      const name = screen.getByText(LONG_NAME)
      expect(name).toHaveClass("break-words")
      for (let node: HTMLElement | null = name; node; node = node.parentElement) {
        expect(node.className).not.toMatch(/truncate|text-ellipsis|line-clamp/)
        // The cards clip only their rounded corners on screen, never on paper.
        if (node.className.includes("overflow-hidden")) {
          expect(node).toHaveClass("print:overflow-visible")
        }
        if (node.hasAttribute("data-print-area")) break
      }
    })
  })

  it("stacks on a phone: one column (360 px)", async () => {
    // jsdom has no layout, the classes decide: no column before `md`, full-width buttons before `sm`.
    vi.stubGlobal("innerWidth", 360)
    renderOverview()
    const card = await roomCard("Room A")
    expect(card.parentElement).toHaveClass("md:grid-cols-2")
    expect(card.parentElement).not.toHaveClass("grid-cols-2")
  })

  it("sizes each room card by its content: a crowded room does not stretch its neighbour (#729)", async () => {
    const crowd = Array.from({ length: 50 }, (_, index) =>
      person(`c${index}`, `Dítě${index}`, "Zástup"),
    )
    data = { ...base(), rooms: [room("r1", "Crowded", 50, crowd), room("r2", "Empty", 2)] }
    renderOverview()
    const empty = await roomCard("Empty")
    const list = empty.parentElement!
    expect(list.className).not.toMatch(/auto-rows-fr|items-stretch/)
    expect(list).toHaveClass("items-start")
    expect(empty.firstElementChild!.className).not.toMatch(/(^|\s)h-full/)
    // Print keeps its columns and never splits a room that fits a page.
    expect(list).toHaveClass("print:columns-2")
    expect(empty).toHaveClass("print:break-inside-avoid")
  })
})
