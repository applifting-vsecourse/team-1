import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { RoomAssignments, RoomWarning } from "@/features/events/api/room-assignments"
import type { TermRooms } from "@/features/events/api/rooms"
import { RoomsOverview } from "@/features/events/components/RoomsOverview"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get }, apiErrorCode: () => undefined }))

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
) => ({ id, name, capacity, extraBeds, beds: capacity + extraBeds, gender, participants })
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

function renderOverview() {
  get.mockImplementation(() => ({ json: () => Promise.resolve(data) }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <RoomsOverview
        term={term}
        selectors={<span>Term picker</span>}
        onShowAssignment={onShowAssignment}
      />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}
/** The summary cards on screen (the print header has its own list with the same labels). */
const summaryList = (): HTMLElement =>
  screen
    .getAllByText("Rooms")
    .map((label) => label.closest("dl")!)
    .find((list) => list.classList.contains("md:grid-cols-4"))!
const roomCard = async (name: string) =>
  (await screen.findByRole("heading", { name, level: 3 })).closest("li") as HTMLElement

beforeEach(() => {
  data = base()
  get.mockReset()
  onShowAssignment.mockReset()
})
afterEach(() => vi.unstubAllGlobals())

describe("RoomsOverview (US-36)", () => {
  it("lists every room with its people, birth years, free beds and extra beds (AC1, AC2)", async () => {
    renderOverview()
    const a = within(await roomCard("Room A"))
    expect(a.getByText("2 / 4")).toBeInTheDocument()
    expect(a.getByText("2 free beds")).toBeInTheDocument()
    expect(a.getByText("Eva Horká")).toBeInTheDocument()
    expect(a.getByText("b. 2010")).toBeInTheDocument()
    expect(a.getByText("Jana Nováková")).toBeInTheDocument()
    expect(a.getByText("b. 2011")).toBeInTheDocument()
    expect(a.getAllByText("Free bed")).toHaveLength(2)
    // The one still to evaluate is marked.
    expect(a.getAllByText("Awaiting evaluation")).toHaveLength(1)

    const b = within(await roomCard("Room B"))
    expect(b.getByText("1 / 3")).toBeInTheDocument()
    // The same badge as in the room assignment (US-80).
    expect(b.getByText("Extra bed +1")).toHaveAttribute("data-variant", "info")
    // Right under the capacity, on the right side of the card.
    expect(b.getByText("Extra bed +1").parentElement).toHaveClass("justify-end")
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
    expect(document.body.textContent).not.toMatch(/individual/i)
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
    expect(within(await roomCard("Room A")).getAllByText("Free bed")).toHaveLength(3)
    expect(screen.getAllByText("Free bed")).toHaveLength(5)
    expect(screen.getByRole("button", { name: "Print overview" })).toBeEnabled()
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
    expect(screen.getByRole("button", { name: "Print overview" })).toBeDisabled()
    await user.click(screen.getByRole("button", { name: "Go to the room assignment" }))
    expect(onShowAssignment).toHaveBeenCalledOnce()
  })

  it("links to the assignment from open warnings only (US-37), never lists them", async () => {
    data.warnings = [warning(), warning({ acknowledged: true })]
    data.summary = { violations: 1, acknowledged: 1, confirmedWithoutBed: 0 }
    const user = renderOverview()
    expect(await screen.findByText("The room assignment has 1 warning.")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Show in the assignment" }))
    expect(onShowAssignment).toHaveBeenCalledOnce()
  })

  it("has no warning line when only people without a bed are warned about", async () => {
    data.warnings = [
      warning({ kind: "CONFIRMED_WITHOUT_BED", roomId: null, applicationTermId: "p4" }),
    ]
    data.summary = { violations: 0, acknowledged: 0, confirmedWithoutBed: 1 }
    renderOverview()
    await roomCard("Room A")
    expect(screen.queryByText(/warning/)).not.toBeInTheDocument()
  })

  it("has no warning line without an open warning", async () => {
    data.warnings = [warning({ acknowledged: true })]
    renderOverview()
    await roomCard("Room A")
    expect(screen.queryByText(/warning/)).not.toBeInTheDocument()
  })

  it("prints, and has no button to edit the assignment", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined)
    const user = renderOverview()
    await roomCard("Room A")
    expect(screen.queryByRole("button", { name: "Edit assignment" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Print overview" }))
    expect(print).toHaveBeenCalledOnce()
    print.mockRestore()
  })

  it("puts the to-evaluate label next to the name, not into the year of birth", async () => {
    renderOverview()
    const card = within(await roomCard("Room A"))
    const label = card.getByText("Awaiting evaluation")
    const name = card.getByText("Eva Horká")
    expect(label.parentElement).toBe(name.parentElement)
    expect(label.parentElement).not.toContainElement(card.getByText("b. 2010"))
  })

  it("makes every room card the same size", async () => {
    renderOverview()
    const card = await roomCard("Room A")
    expect(card.parentElement).toHaveClass("md:auto-rows-fr")
    expect(card.firstElementChild).toHaveClass("h-full")
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
      const toolbar = screen.getByText("Term picker").parentElement!
      expect(toolbar).toHaveClass("print:hidden")
      expect(summaryList()).toHaveClass("print:hidden")
      // Nothing that is clicked is printed: every button sits inside the hidden toolbar.
      for (const button of screen.getAllByRole("button")) {
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

  it("stacks on a phone: one column, buttons over the whole width (360 px)", async () => {
    // jsdom has no layout, the classes decide: no column before `md`, full-width buttons before `sm`.
    vi.stubGlobal("innerWidth", 360)
    renderOverview()
    const card = await roomCard("Room A")
    expect(card.parentElement).toHaveClass("md:grid-cols-2")
    expect(card.parentElement).not.toHaveClass("grid-cols-2")
    expect(screen.getByRole("button", { name: "Print overview" })).toHaveClass("max-sm:w-full")
  })
})
