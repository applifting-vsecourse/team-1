import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { TermRooms } from "@/features/events/api/rooms"
import { CopyRoomsDialog } from "@/features/events/components/CopyRoomsDialog"

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

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get, post }, apiErrorCode: () => undefined }))

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
  capacity: {
    FEMALE: 0,
    MALE: 0,
    total: rooms.reduce((n, room) => n + room.capacity + room.extraBeds, 0),
  },
})
const sourceRooms = [
  { id: "a", name: "A", capacity: 4, extraBeds: 0, beds: 4, gender: "FEMALE" as const },
  { id: "b", name: "B", capacity: 6, extraBeds: 0, beds: 6, gender: "MALE" as const },
]
const ownRoom = [
  { id: "o", name: "Own", capacity: 3, extraBeds: 0, beds: 3, gender: "MALE" as const },
]
const sourceTerms = [
  {
    id: "t2",
    name: "Week 2",
    startsOn: "2027-07-19",
    endsOn: "2027-07-25",
    roomMode: "GENDERED" as const,
  },
  {
    id: "t3",
    name: "Week 3",
    startsOn: "2027-07-26",
    endsOn: "2027-08-01",
    roomMode: "SHARED" as const,
  },
]

function renderDialog(target: TermRooms, source: TermRooms["rooms"] = sourceRooms) {
  get.mockImplementation(() => ({
    json: () => Promise.resolve(termRooms("t2", source)),
  }))
  post.mockResolvedValue(undefined)
  const onCopied = vi.fn().mockResolvedValue(undefined)
  const onClose = vi.fn()
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CopyRoomsDialog
        target={target}
        sourceTerms={sourceTerms}
        onClose={onClose}
        onCopied={onCopied}
      />
    </QueryClientProvider>,
  )
  return { onCopied, onClose, user: userEvent.setup() }
}

async function pickSource(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("combobox", { name: "Source term" }))
  expect(
    await screen.findByRole("option", { name: /Week 3.*different room mode/ }),
  ).toHaveAttribute("aria-disabled", "true")
  await user.click(screen.getByRole("option", { name: /Week 2 · rooms by gender/ }))
  expect(await screen.findByRole("button", { name: /Copy rooms|Add 2 rooms/ })).toBeEnabled()
}

describe("copying rooms into a term", () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it("previews the copy into an empty term and copies without a choice", async () => {
    const { user, onCopied, onClose } = renderDialog(termRooms("t1", []))
    expect(screen.getByRole("button", { name: "Copy rooms" })).toBeDisabled()
    await pickSource(user)
    expect(
      screen.getByText(/The target term gets 2 rooms of its own and a capacity of 10 beds/),
    ).toBeInTheDocument()
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Copy rooms" }))
    expect(post).toHaveBeenCalledWith("organizer/events/e1/terms/t1/rooms/copy", {
      json: { sourceTermId: "t2", strategy: "ADD" },
    })
    expect(onCopied).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it("adds to the existing rooms by default and says what will be left", async () => {
    const { user, onCopied } = renderDialog(termRooms("t1", ownRoom))
    await pickSource(user)
    expect(screen.getByText("Add the copied rooms?")).toBeInTheDocument()
    expect(
      screen.getByText(/After the copy the target will have 3 rooms and 13 beds/),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Add 2 rooms" }))
    expect(post).toHaveBeenCalledWith("organizer/events/e1/terms/t1/rooms/copy", {
      json: { sourceTermId: "t2", strategy: "ADD" },
    })
    expect(onCopied).toHaveBeenCalled()
  })

  it("replaces the existing rooms after the organizer chooses to", async () => {
    const { user, onCopied } = renderDialog(termRooms("t1", ownRoom))
    await pickSource(user)
    await user.click(screen.getByRole("radio", { name: "Replace the existing rooms" }))
    expect(screen.getByText("Replace the existing rooms?")).toBeInTheDocument()
    expect(
      screen.getByText(/The 1 existing room will be removed, including its extra beds/),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Replace rooms" }))
    expect(post).toHaveBeenCalledWith("organizer/events/e1/terms/t1/rooms/copy", {
      json: { sourceTermId: "t2", strategy: "REPLACE" },
    })
    expect(onCopied).toHaveBeenCalled()
  })

  it("warns about names that already exist in the target before an add, and not for a replace", async () => {
    const { user } = renderDialog(
      termRooms("t1", [
        { id: "o", name: "a", capacity: 3, extraBeds: 0, beds: 3, gender: "MALE" as const },
      ]),
    )
    await pickSource(user)
    expect(screen.getByText("Some room names already exist")).toBeInTheDocument()
    expect(screen.getByText(/already has rooms named A\./)).toBeInTheDocument()
    await user.click(screen.getByRole("radio", { name: "Replace the existing rooms" }))
    expect(screen.queryByText("Some room names already exist")).not.toBeInTheDocument()
  })

  it("shows no warning when the names differ", async () => {
    const { user } = renderDialog(termRooms("t1", ownRoom))
    await pickSource(user)
    expect(screen.queryByText("Some room names already exist")).not.toBeInTheDocument()
  })

  describe("extra beds (přistýlky) are not copied", () => {
    // Source: 10 own beds + 2 extra beds (capacity.total 12). Target: one room with 3 own beds + 2 extra beds.
    const withExtras = [
      { id: "a", name: "A", capacity: 4, extraBeds: 2, beds: 6, gender: "FEMALE" as const },
      { id: "b", name: "B", capacity: 6, extraBeds: 0, beds: 6, gender: "MALE" as const },
    ]
    const ownWithExtras = [
      { id: "o", name: "Own", capacity: 3, extraBeds: 2, beds: 5, gender: "MALE" as const },
    ]

    it("counts only the own beds of a source with extra beds and says what is not copied", async () => {
      const { user } = renderDialog(termRooms("t1", []), withExtras)
      await pickSource(user)
      expect(screen.getByText(/2 rooms of its own and a capacity of 10 beds/)).toBeInTheDocument()
      expect(screen.getByText(/2 rooms, 10 beds/)).toBeInTheDocument()
      expect(screen.getByText("without 2 extra beds")).toBeInTheDocument()
      expect(screen.getByText("Will be copied")).toBeInTheDocument()
      expect(screen.getByText("Room name, capacity and gender")).toBeInTheDocument()
      expect(screen.getByText("Won't be copied")).toBeInTheDocument()
      expect(screen.getByText("Extra beds – they belong to a specific term")).toBeInTheDocument()
      expect(screen.queryByText(/12 beds/)).not.toBeInTheDocument()
    })

    it("shows no note for a source without extra beds", async () => {
      const { user } = renderDialog(termRooms("t1", []))
      await pickSource(user)
      expect(screen.queryByText(/extra bed/)).not.toBeInTheDocument()
      expect(screen.getByText("Won't be copied")).toBeInTheDocument()
    })

    it("adds: target beds with its extra beds plus the own beds of the source", async () => {
      const { user } = renderDialog(termRooms("t1", ownWithExtras), withExtras)
      await pickSource(user)
      expect(screen.getByText("without 2 extra beds")).toBeInTheDocument()
      expect(screen.getByText("including 2 extra beds")).toBeInTheDocument()
      // 5 (target with extra beds) + 10 (source without extra beds) = 15, not 17.
      expect(
        screen.getByText(
          "After the copy the target will have 3 rooms and 15 beds, including 2 extra beds of the existing rooms. The current room is kept.",
        ),
      ).toBeInTheDocument()
      expect(screen.getByText("Won't be copied")).toBeInTheDocument()
    })

    it("adds without a sentence about extra beds when the target has none", async () => {
      const { user } = renderDialog(termRooms("t1", ownRoom), withExtras)
      await pickSource(user)
      expect(
        screen.getByText(
          /After the copy the target will have 3 rooms and 13 beds\. The current room is kept\./,
        ),
      ).toBeInTheDocument()
      expect(screen.queryByText(/including .* extra bed/)).not.toBeInTheDocument()
    })

    it("replaces: only the own beds of the source and a warning that extra beds and assignments go too", async () => {
      const { user } = renderDialog(termRooms("t1", ownWithExtras), withExtras)
      await pickSource(user)
      await user.click(screen.getByRole("radio", { name: "Replace the existing rooms" }))
      expect(
        screen.getByText(
          "The 1 existing room will be removed, including its extra beds, the assignment of participants to rooms and confirmed warnings. After the copy the target will have 2 rooms and 10 beds.",
        ),
      ).toBeInTheDocument()
    })

    it("does not mention the gender when the rooms are shared", async () => {
      const { user } = renderDialog({ ...termRooms("t1", []), roomMode: "SHARED" }, withExtras)
      await user.click(screen.getByRole("combobox", { name: "Source term" }))
      await user.click(screen.getByRole("option", { name: /Week 3 · shared rooms/ }))
      expect(await screen.findByText("Room name and capacity")).toBeInTheDocument()
      expect(screen.queryByText("Room name, capacity and gender")).not.toBeInTheDocument()
    })

    it("keeps the name collision warning for an add and the 360 px layout stacks the summary", async () => {
      window.innerWidth = 360
      const { user } = renderDialog(
        termRooms("t1", [
          { id: "o", name: "a", capacity: 3, extraBeds: 2, beds: 5, gender: "MALE" as const },
        ]),
        withExtras,
      )
      await pickSource(user)
      expect(screen.getByText("Some room names already exist")).toBeInTheDocument()
      // Below `sm` the source / target summary is one column (the `sm:grid-cols-2` class only applies from 640 px).
      const summary = screen.getByText("Copied source").closest("dl")
      expect(summary).toHaveClass("grid", "sm:grid-cols-2")
      expect(summary).not.toHaveClass("grid-cols-2")
    })
  })
})
