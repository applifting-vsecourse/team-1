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
  capacity: { FEMALE: 0, MALE: 0, total: rooms.reduce((n, room) => n + room.capacity, 0) },
})
const sourceRooms = [
  { id: "a", name: "A", capacity: 4, gender: "FEMALE" as const },
  { id: "b", name: "B", capacity: 6, gender: "MALE" as const },
]
const ownRoom = [{ id: "o", name: "Own", capacity: 3, gender: "MALE" as const }]
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

function renderDialog(target: TermRooms) {
  get.mockImplementation(() => ({
    json: () => Promise.resolve(termRooms("t2", sourceRooms)),
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
  expect(await screen.findByText("2 rooms · 10 beds")).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "Show preview" }))
}

describe("copying rooms into a term", () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it("previews the copy into an empty term and copies without a choice", async () => {
    const { user, onCopied, onClose } = renderDialog(termRooms("t1", []))
    expect(screen.getByRole("button", { name: "Show preview" })).toBeDisabled()
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
    expect(screen.getByText(/The current room will be removed/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Replace rooms" }))
    expect(post).toHaveBeenCalledWith("organizer/events/e1/terms/t1/rooms/copy", {
      json: { sourceTermId: "t2", strategy: "REPLACE" },
    })
    expect(onCopied).toHaveBeenCalled()
  })
})
