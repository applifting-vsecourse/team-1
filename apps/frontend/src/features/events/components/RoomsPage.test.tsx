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

import { roomCapacityIncreaseKey } from "@/lib/room-capacity-increase"

import type { TermRooms } from "@/features/events/api/rooms"
import {
  RoomsPage,
  type AccommodationTerm,
  type RoomsView,
} from "@/features/events/components/RoomsPage"

// CI runners take over 5 s for these accommodation renders.
vi.setConfig({ testTimeout: 20_000 })

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

const { get, post, patch, success } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  success: vi.fn(),
}))
vi.mock("@/lib/api-client", () => ({ api: { get, post, patch }, apiErrorCode: () => undefined }))
vi.mock("@/lib/notify", () => ({ notify: { success } }))

const terms: AccommodationTerm[] = [
  {
    id: "t1",
    name: "Week 1",
    startsOn: "2027-07-12",
    endsOn: "2027-07-18",
    roomCount: 2,
    roomMode: "GENDERED",
    byGender: { FEMALE: { free: 0 }, MALE: { free: 2 } },
  },
  {
    id: "t3",
    name: "Week 3",
    startsOn: "2027-07-26",
    endsOn: "2027-08-01",
    roomCount: 2,
    roomMode: "GENDERED",
    byGender: { FEMALE: { free: 0 }, MALE: { free: 2 } },
  },
  {
    id: "t2",
    name: "Week 2",
    startsOn: "2027-07-19",
    endsOn: "2027-07-25",
    roomCount: 1,
    roomMode: "SHARED",
    byGender: null,
  },
]
const termRooms = (termId: string, rooms: TermRooms["rooms"], roomMode: TermRooms["roomMode"]) => ({
  eventId: "e1",
  eventName: "Summer camp",
  organizationName: "Camp",
  organizationContactEmail: null,
  termId,
  termName: termId,
  startsOn: "2027-07-12",
  endsOn: "2027-07-18",
  roomMode,
  roomsPublished: false,
  rooms,
  capacity: {
    FEMALE: rooms.filter((room) => room.gender === "FEMALE").reduce((n, r) => n + r.beds, 0),
    MALE: rooms.filter((room) => room.gender === "MALE").reduce((n, r) => n + r.beds, 0),
    total: rooms.reduce((n, r) => n + r.beds, 0),
  },
})
const byTerm: Record<string, TermRooms> = {
  t1: termRooms(
    "t1",
    [
      {
        id: "r1",
        name: "Gendered room",
        gender: "FEMALE",
        capacity: 5000,
        extraBeds: 2,
        beds: 5002,
      },
      { id: "r2", name: "Men's room", gender: "MALE", capacity: 4, extraBeds: 0, beds: 4 },
    ],
    "GENDERED",
  ),
  t2: termRooms(
    "t2",
    [{ id: "s1", name: "Shared room", gender: null, capacity: 60, extraBeds: 0, beds: 60 }],
    "SHARED",
  ),
}

const requestsByTerm: Record<string, unknown[]> = {
  t1: [
    {
      applicationTermId: "at1",
      applicationId: "a1",
      firstName: "Barbora",
      lastName: "Šimková",
      status: "CONFIRMED",
      request: "Prosím o pokoj v přízemí.",
    },
    {
      applicationTermId: "at2",
      applicationId: "a2",
      firstName: "Filip",
      lastName: "Horák",
      status: "WAITLISTED",
      request: null,
    },
  ],
  t2: [],
}

function renderRooms(
  termId: string,
  view: RoomsView = "assignment",
  options: { failRooms?: boolean; failRequests?: boolean } = {},
) {
  const onSelectTerm = vi.fn()
  const onSelectView = vi.fn()
  get.mockImplementation((path: string) => ({
    json: () => {
      const requestsTerm = /terms\/([^/]+)\/individual-requests/.exec(path)?.[1]
      if (requestsTerm) {
        return options.failRequests
          ? Promise.reject(new Error("requests down"))
          : Promise.resolve({ requests: requestsByTerm[requestsTerm] ?? [] })
      }
      if (options.failRooms && path.includes("/rooms")) {
        return Promise.reject(new Error("rooms down"))
      }
      const roomTerm = byTerm[/terms\/([^/]+)\/rooms/.exec(path)?.[1] ?? ""]
      const assignmentTerm = byTerm[/terms\/([^/]+)\/room-assignments/.exec(path)?.[1] ?? ""]
      return Promise.resolve(
        assignmentTerm
          ? {
              eventId: "e1",
              termId: assignmentTerm.termId,
              rooms: assignmentTerm.rooms.map((room) => ({ ...room, participants: [] })),
              unassigned: [],
              warnings: [],
              summary: { violations: 0, acknowledged: 0, confirmedWithoutBed: 0 },
            }
          : roomTerm,
      )
    },
  }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider client={client}>
        <RoomsPage
          eventId="e1"
          termId={termId}
          view={view}
          terms={terms}
          onSelectTerm={onSelectTerm}
          onSelectView={onSelectView}
        />
      </QueryClientProvider>
    ),
  })
  const termsRoute = createRoute({
    getParentRoute: () => root,
    path: "/organizer/events/$eventId/terms",
  })
  const applicationRoute = createRoute({
    getParentRoute: () => root,
    path: "/organizer/events/$eventId/applications/$applicationId",
  })
  const router = createRouter({
    routeTree: root.addChildren([termsRoute, applicationRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(<RouterProvider router={router} />)
  return { client, onSelectTerm, onSelectView, user: userEvent.setup() }
}

describe("accommodation by term", () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    patch.mockReset()
    success.mockReset()
  })

  it("shows only the rooms of the selected term, with its metrics and the gender with the room name", async () => {
    renderRooms("t1")
    const table = await screen.findByRole("table")
    expect(within(table).getByText(/^Gendered room/)).toBeInTheDocument()
    expect(within(table).queryByText(/Shared room/)).not.toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("organizer/events/e1/terms/t1/rooms")
    expect(screen.getByText("Women's rooms")).toBeInTheDocument()
    expect(screen.getByText("Capacity exhausted")).toBeInTheDocument()
    expect(screen.getByText("Beds available")).toBeInTheDocument()
    expect(within(table).getByText("Gendered room")).toBeInTheDocument()
    expect(within(table).getByText("Women's")).toBeInTheDocument()
    expect(within(table).getByText("Extra bed +2")).toBeInTheDocument()
  })

  it("switches between Assignment and Rooms with a switcher above the term (#542)", async () => {
    const { user, onSelectView } = renderRooms("t1")
    await screen.findByRole("table")
    const views = screen.getByRole("radiogroup", { name: "Accommodation view" })
    const assignment = within(views).getByRole("radio", { name: "Assignment" })
    const rooms = within(views).getByRole("radio", { name: "Rooms" })
    expect(assignment).toBeChecked()
    const term = screen.getByRole("combobox", { name: "Term" })
    expect(views.compareDocumentPosition(term) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await user.tab()
    expect(assignment).toHaveFocus()
    await user.keyboard("{ArrowRight}")
    await waitFor(() => expect(rooms).toHaveFocus())
    await user.keyboard(" ")
    expect(onSelectView).toHaveBeenCalledWith("overview")
  })

  it("offers Individual requests as the third view next to Assignment and Rooms (#514)", async () => {
    const { user, onSelectView } = renderRooms("t1")
    await screen.findByRole("table")
    const views = screen.getByRole("radiogroup", { name: "Accommodation view" })
    expect(
      within(views)
        .getAllByRole("radio")
        .map((radio) => radio.textContent),
    ).toEqual(["Assignment", "Rooms", "Individual requests"])
    await user.click(within(views).getByRole("radio", { name: "Individual requests" }))
    expect(onSelectView).toHaveBeenCalledWith("requests")
  })

  it("lists who asked for individual accommodation in the term with the full request and a link to the application (#514)", async () => {
    renderRooms("t1", "requests")
    expect(
      await screen.findByRole("heading", { name: "Individual accommodation requests", level: 3 }),
    ).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("organizer/events/e1/terms/t1/individual-requests")
    expect(screen.getByRole("radio", { name: "Individual requests" })).toBeChecked()
    expect(screen.getByText("Barbora Šimková")).toBeInTheDocument()
    // Line breaks the participant typed stay visible.
    expect(screen.getByText("Prosím o pokoj v přízemí.")).toHaveClass("whitespace-pre-wrap")
    expect(screen.getByText("Filip Horák")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Open the application detail: Barbora Šimková" }),
    ).toHaveAttribute("href", "/organizer/events/e1/applications/a1")
    // The room views are not shown, and the print button belongs to them only.
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Print overview" })).not.toBeInTheDocument()
  })

  it("shows the requests and the term switcher even when the rooms of the term fail to load (#514)", async () => {
    renderRooms("t1", "requests", { failRooms: true })
    expect(await screen.findByText("Prosím o pokoj v přízemí.")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Term" })).toBeInTheDocument()
  })

  it("names the individual requests, not the rooms, when the requests fail to load (#514)", async () => {
    const { user } = renderRooms("t1", "requests", { failRequests: true })
    expect(await screen.findByText("Could not load individual requests")).toBeInTheDocument()
    expect(screen.queryByText("Could not load rooms")).not.toBeInTheDocument()
    const calls = () =>
      get.mock.calls.filter(([path]) => String(path).endsWith("/individual-requests")).length
    const before = calls()
    await user.click(screen.getByRole("button", { name: "Try again" }))
    await waitFor(() => expect(calls()).toBeGreaterThan(before))
  })

  it("says that nobody asked for individual accommodation in a term without requests (#514)", async () => {
    renderRooms("t2", "requests")
    expect(
      await screen.findByText(
        "Nobody has asked for individual accommodation in the selected term.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /application detail/ })).not.toBeInTheDocument()
  })

  it("shows the rooms view of the selected term instead of the assignment", async () => {
    renderRooms("t1", "overview")
    expect(
      await screen.findByRole("heading", { name: "Gendered room", level: 3 }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Rooms" })).toBeChecked()
    expect(screen.getByRole("combobox", { name: "Term" })).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-assignments")
  })

  it.each(["assignment", "overview"] as const)(
    "has the print button in the shared bar of the %s view and prints the same overview",
    async (view) => {
      const print = vi.spyOn(window, "print").mockImplementation(() => undefined)
      const { user } = renderRooms("t1", view)
      await screen.findByRole("radiogroup", { name: "Accommodation view" })
      const button = await screen.findByRole("button", { name: "Print overview" })
      // The button sits in the bar with the switcher, hidden from the paper.
      expect(button.parentElement).toContainElement(screen.getByRole("radiogroup"))
      expect(button.parentElement).toHaveClass("print:hidden")
      // Both views carry the one print sheet of the term.
      await vi.waitFor(() => expect(document.querySelectorAll("[data-print-area]")).toHaveLength(1))
      await user.click(button)
      expect(print).toHaveBeenCalledOnce()
      print.mockRestore()
    },
  )

  it("cannot print a term without rooms", async () => {
    byTerm.t3 = termRooms("t3", [], "GENDERED")
    renderRooms("t3")
    expect(await screen.findByRole("button", { name: "Print overview" })).toBeDisabled()
    delete byTerm.t3
  })

  it("stacks the bar on a phone: the print button takes the whole width (360 px)", async () => {
    renderRooms("t1", "overview")
    expect(await screen.findByRole("button", { name: "Print overview" })).toHaveClass(
      "max-sm:w-full",
    )
    expect(screen.getByRole("radiogroup")).toHaveClass("w-fit")
  })

  it("shows the extra beds in the title only when a room has some, without a +0", async () => {
    renderRooms("t1")
    const table = await screen.findByRole("table")
    expect(within(table).getByText(/Extra bed \+2/)).toBeInTheDocument()
    expect(within(table).queryByText(/Extra bed \+0/)).not.toBeInTheDocument()
    expect(
      within(table).getByRole("button", { name: "Edit extra beds (2) – Gendered room" }),
    ).toBeInTheDocument()
    expect(
      within(table).getByRole("button", { name: "Add an extra bed – Men's room" }),
    ).toBeInTheDocument()
  })

  it("renders icon-only extra bed actions named for the room and the existing extra bed count", async () => {
    renderRooms("t1")
    const table = await screen.findByRole("table")
    const edit = within(table).getByRole("button", { name: "Edit extra beds (2) – Gendered room" })
    const add = within(table).getByRole("button", { name: "Add an extra bed – Men's room" })
    expect(edit.textContent).toBe("")
    expect(add.textContent).toBe("")
    expect(edit.querySelector("svg")).not.toBeNull()
    expect(add.querySelector("svg")).not.toBeNull()
  })

  it("explains the extra beds icon in a tooltip on hover and on focus", async () => {
    const { user } = renderRooms("t1")
    const table = await screen.findByRole("table")
    const add = within(table).getByRole("button", { name: "Add an extra bed – Men's room" })
    await user.hover(add)
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Add an extra bed – Men's room")
    await user.unhover(add)
    act(() =>
      within(table).getByRole("button", { name: "Edit extra beds (2) – Gendered room" }).focus(),
    )
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Edit extra beds (2) – Gendered room",
    )
  })

  it("has no extra bed note in the title while no room has extra beds", async () => {
    renderRooms("t2")
    const table = await screen.findByRole("table")
    expect(within(table).queryByText(/Extra bed \+/)).toBeNull()
  })

  it("adds extra beds in a dialog that saves and closes", async () => {
    patch.mockResolvedValue(undefined)
    const { user } = renderRooms("t1")
    const table = await screen.findByRole("table")
    await user.click(within(table).getByRole("button", { name: "Add an extra bed – Men's room" }))
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByLabelText("Number of extra beds"), "3")
    await user.click(within(dialog).getByRole("button", { name: "Save extra beds" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(patch).toHaveBeenCalledWith("organizer/events/e1/terms/t1/rooms/r2/extra-beds", {
      json: { extraBeds: 3 },
    })
    expect(success).toHaveBeenCalledWith("Extra beds saved")
  })

  it("explains an invalid number in the dialog instead of saving it", async () => {
    const { user } = renderRooms("t1")
    const table = await screen.findByRole("table")
    await user.click(within(table).getByRole("button", { name: "Add an extra bed – Men's room" }))
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByLabelText("Number of extra beds"), "0")
    await user.click(within(dialog).getByRole("button", { name: "Save extra beds" }))
    expect(await within(dialog).findByText("Enter a whole number, at least 1.")).toBeInTheDocument()
    expect(patch).not.toHaveBeenCalled()
  })

  it("removes the extra beds of a room with a button instead of entering 0", async () => {
    patch.mockResolvedValue(undefined)
    const { user } = renderRooms("t1")
    const table = await screen.findByRole("table")
    await user.click(
      within(table).getByRole("button", { name: "Edit extra beds (2) – Gendered room" }),
    )
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByLabelText("Number of extra beds")).toHaveValue(2)
    expect(within(dialog).getByText("5002")).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "Remove extra beds" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(patch).toHaveBeenCalledWith("organizer/events/e1/terms/t1/rooms/r1/extra-beds", {
      json: { extraBeds: 0 },
    })
  })

  it("lists the rooms with their actions below at 360 px", async () => {
    window.innerWidth = 360
    renderRooms("t1")
    await screen.findByRole("table")
    expect(screen.getAllByText(/Extra bed \+2/).length).toBeGreaterThan(0)
    expect(
      screen.getAllByRole("button", { name: "Edit extra beds (2) – Gendered room" }).length,
    ).toBe(2)
  })

  it("shows a shared term with its shared capacity and no gender in the room title", async () => {
    renderRooms("t2")
    const table = await screen.findByRole("table")
    expect(within(table).getByText("Shared room")).toBeInTheDocument()
    expect(screen.getByText("Room capacity")).toBeInTheDocument()
    expect(within(table).queryByText(/Women's|Men's/)).not.toBeInTheDocument()
    expect(screen.queryByText("Capacity exhausted")).not.toBeInTheDocument()
  })

  it("labels each room action when hovered or focused", async () => {
    const { user } = renderRooms("t1")
    const table = await screen.findByRole("table")
    const edit = within(table).getByRole("button", { name: "Edit room Gendered room" })
    const remove = within(table).getByRole("button", { name: "Delete room Gendered room" })
    await user.hover(edit)
    expect(await screen.findByRole("tooltip", { name: "Edit room" })).toBeVisible()
    await user.unhover(edit)
    edit.focus()
    await user.tab()
    expect(remove).toHaveFocus()
    expect(await screen.findByRole("tooltip", { name: "Delete room" })).toBeVisible()
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
    await user.click(await screen.findByRole("option", { name: "19–25 Jul 2027 · Week 2" }))
    expect(onSelectTerm).toHaveBeenCalledWith("t2")
  })

  it("records only the observed increase after adding a gendered room", async () => {
    const original = byTerm.t1!
    post.mockImplementationOnce(() => {
      byTerm.t1 = termRooms(
        "t1",
        [
          ...original.rooms,
          { id: "added", name: "New", gender: "FEMALE", capacity: 5, extraBeds: 0, beds: 5 },
        ],
        "GENDERED",
      )
      return Promise.resolve()
    })
    const { client, user } = renderRooms("t1")
    try {
      await user.click(await screen.findByRole("button", { name: "Add room" }))
      const dialog = await screen.findByRole("dialog")
      await user.type(within(dialog).getByLabelText("Room name *"), "New")
      await user.type(within(dialog).getByLabelText("Capacity *"), "5")
      await user.click(within(dialog).getByRole("button", { name: "Add room" }))
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
      expect(client.getQueryData(roomCapacityIncreaseKey("e1", "t1"))).toMatchObject({
        gender: "FEMALE",
        addedBeds: 5,
        capacity: { FEMALE: 5007, MALE: 4 },
      })
    } finally {
      byTerm.t1 = original
    }
  })

  it("reports newly copied rooms, excluding rooms already in the target", async () => {
    const original = byTerm.t1!
    post.mockImplementationOnce(() => {
      byTerm.t1 = termRooms(
        "t1",
        [...original.rooms, { ...byTerm.t3!.rooms[0]!, id: "new-copy" }],
        "GENDERED",
      )
      return Promise.resolve()
    })
    byTerm.t3 = termRooms(
      "t3",
      [{ id: "x", name: "Other", gender: "MALE", capacity: 4, extraBeds: 0, beds: 4 }],
      "GENDERED",
    )
    const { user } = renderRooms("t1")
    await screen.findByRole("table")
    await user.click(screen.getByRole("button", { name: "Copy rooms from term…" }))
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("combobox", { name: "Source term" }))
    await user.click(await screen.findByRole("option", { name: /Week 3/ }))
    await user.click(await within(dialog).findByRole("button", { name: "Show preview" }))
    await user.click(await within(dialog).findByRole("button", { name: "Add 1 room" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(post).toHaveBeenCalledWith("organizer/events/e1/terms/t1/rooms/copy", {
      json: { sourceTermId: "t3", strategy: "ADD" },
    })
    expect(success).toHaveBeenCalledWith("1 room copied")
    byTerm.t1 = original
    expect(screen.queryByText("The copy is done.")).not.toBeInTheDocument()
  })
})
