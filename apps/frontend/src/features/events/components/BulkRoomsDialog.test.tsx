import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { TermRooms } from "@/features/events/api/rooms"
import { BulkRoomsDialog, nextRoomNumber } from "@/features/events/components/BulkRoomsDialog"

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)

const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { post }, apiErrorCode: () => undefined }))

const term: TermRooms = {
  eventId: "e1",
  eventName: "Summer camp",
  organizationName: "Camp",
  termId: "t1",
  termName: "Week 1",
  startsOn: "2027-07-19",
  endsOn: "2027-07-25",
  roomMode: "SHARED",
  rooms: [
    { id: "a", name: "7", capacity: 4, extraBeds: 0, beds: 4, gender: null },
    { id: "b", name: "Hall", capacity: 4, extraBeds: 0, beds: 4, gender: null },
  ],
  capacity: { FEMALE: 0, MALE: 0, total: 8 },
}
const renderDialog = (data = term) => {
  const onClose = vi.fn()
  const onSaved = vi.fn().mockResolvedValue(undefined)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BulkRoomsDialog
        term={data}
        onClose={onClose}
        onSaved={onSaved}
      />
    </QueryClientProvider>,
  )
  return { onClose, onSaved, user: userEvent.setup() }
}

describe("bulk rooms dialog", () => {
  beforeEach(() => post.mockReset())

  it("prefills the next free number from the numeric room names", () => {
    expect(nextRoomNumber(term.rooms)).toBe(8)
    expect(nextRoomNumber([{ name: "Hall" }])).toBe(1)
    renderDialog()
    expect(screen.getByLabelText("First room number *")).toHaveValue(8)
  })

  it("previews rooms, beds and the number range before saving", async () => {
    const { user } = renderDialog()
    expect(screen.queryByText(/Will create/)).not.toBeInTheDocument()
    await user.type(screen.getByLabelText("Number of rooms *"), "20")
    await user.type(screen.getByLabelText("Beds per room *"), "4")
    expect(screen.getByText("Will create: 20 rooms, 80 beds (numbers 8–27)")).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it("keeps invalid values in the form without sending", async () => {
    const { user } = renderDialog()
    await user.type(screen.getByLabelText("Number of rooms *"), "201")
    await user.type(screen.getByLabelText("Beds per room *"), "4")
    await user.click(screen.getByRole("button", { name: "Create rooms" }))
    expect(await screen.findByText("Enter a whole number from 1 to 200.")).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it("sends a shared term without a gender and closes after success", async () => {
    post.mockResolvedValue(undefined)
    const { user, onClose, onSaved } = renderDialog()
    await user.type(screen.getByLabelText("Number of rooms *"), "3")
    await user.type(screen.getByLabelText("Beds per room *"), "4")
    await user.click(screen.getByRole("button", { name: "Create rooms" }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(onSaved).toHaveBeenCalled()
    expect(post).toHaveBeenCalledWith("organizer/events/e1/terms/t1/rooms/bulk", {
      json: { count: 3, capacity: 4, firstNumber: 8 },
    })
  })

  it("sends the chosen gender in a gendered term", async () => {
    post.mockResolvedValue(undefined)
    const { user } = renderDialog({ ...term, roomMode: "GENDERED" })
    await user.type(screen.getByLabelText("Number of rooms *"), "2")
    await user.type(screen.getByLabelText("Beds per room *"), "6")
    await user.click(screen.getByRole("button", { name: "Create rooms" }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post).toHaveBeenCalledWith("organizer/events/e1/terms/t1/rooms/bulk", {
      json: { count: 2, capacity: 6, firstNumber: 8, gender: "FEMALE" },
    })
  })

  it("keeps the entered data on an API error", async () => {
    post.mockRejectedValueOnce(new Error("Connection failed"))
    const { user, onClose } = renderDialog()
    await user.type(screen.getByLabelText("Number of rooms *"), "3")
    await user.type(screen.getByLabelText("Beds per room *"), "4")
    await user.click(screen.getByRole("button", { name: "Create rooms" }))
    expect(await screen.findByText("Connection failed")).toBeInTheDocument()
    expect(screen.getByLabelText("Number of rooms *")).toHaveValue(3)
    expect(onClose).not.toHaveBeenCalled()
  })
})
