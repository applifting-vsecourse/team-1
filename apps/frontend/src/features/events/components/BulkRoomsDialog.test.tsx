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

const { post, notify } = vi.hoisted(() => ({
  post: vi.fn(),
  notify: { success: vi.fn(), warning: vi.fn() },
}))
vi.mock("@/lib/api-client", () => ({ api: { post }, apiErrorCode: () => undefined }))
vi.mock("@/lib/notify", () => ({ notify }))
const fail = (error: Error) => ({ json: () => Promise.reject(error) })
const respond = (result: { created: string[]; skipped: string[] }) => ({
  json: () => Promise.resolve(result),
})

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

const url = "organizer/events/e1/terms/t1/rooms/bulk"
const fill = async (user: ReturnType<typeof userEvent.setup>, values: Record<string, string>) => {
  for (const [label, value] of Object.entries(values)) {
    await user.type(screen.getByLabelText(label), value)
  }
}
const gendered: TermRooms = { ...term, roomMode: "GENDERED" }

describe("bulk rooms dialog", () => {
  beforeEach(() => {
    post.mockReset()
    notify.success.mockReset()
    notify.warning.mockReset()
  })

  it("prefills the next free number from the numeric room names", () => {
    expect(nextRoomNumber(term.rooms)).toBe(8)
    expect(nextRoomNumber([{ name: "Hall" }])).toBe(1)
    renderDialog()
    expect(screen.getByLabelText("First room number *")).toHaveValue(8)
  })

  it("previews the rooms, beds and numbers of a shared term before saving", async () => {
    const { user } = renderDialog()
    expect(screen.queryByText(/Will create/)).not.toBeInTheDocument()
    await fill(user, { "Number of rooms *": "20", "Beds per room *": "4" })
    expect(screen.getByText("Will create: 20 rooms, 80 beds (numbers 8–27)")).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it("previews women's, men's and total rooms and beds with continuous numbers", async () => {
    const { user } = renderDialog(gendered)
    expect(screen.queryByLabelText("Number of rooms *")).not.toBeInTheDocument()
    await fill(user, {
      "Number of women's rooms": "3",
      "Number of men's rooms": "2",
      "Beds per room *": "4",
    })
    expect(screen.getByText("Women's rooms: 3 rooms, 12 beds (numbers 8–10)")).toBeInTheDocument()
    expect(screen.getByText("Men's rooms: 2 rooms, 8 beds (numbers 11–12)")).toBeInTheDocument()
    expect(screen.getByText("Total: 5 rooms, 20 beds")).toBeInTheDocument()
  })

  it("keeps invalid values in the form without sending", async () => {
    const { user } = renderDialog()
    await fill(user, { "Number of rooms *": "1001", "Beds per room *": "4" })
    await user.click(screen.getByRole("button", { name: "Create rooms" }))
    expect(await screen.findByText("Enter a whole number from 1 to 1000.")).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it("asks for at least one room in a gendered term", async () => {
    const { user } = renderDialog(gendered)
    await fill(user, { "Beds per room *": "4" })
    await user.click(screen.getByRole("button", { name: "Create rooms" }))
    expect(
      await screen.findByText("Enter at least one room, at most 1000 in total."),
    ).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it("sends a shared term as one count, reports the result and closes", async () => {
    post.mockReturnValue(respond({ created: ["8", "9", "10"], skipped: [] }))
    const { user, onClose, onSaved } = renderDialog()
    await fill(user, { "Number of rooms *": "3", "Beds per room *": "4" })
    await user.click(screen.getByRole("button", { name: "Create rooms" }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(onSaved).toHaveBeenCalled()
    expect(post).toHaveBeenCalledWith(url, { json: { count: 3, capacity: 4, firstNumber: 8 } })
    expect(notify.success).toHaveBeenCalledWith("Created: 3 rooms")
  })

  it("sends the counts per gender in a gendered term", async () => {
    post.mockReturnValue(respond({ created: ["8", "9", "10"], skipped: [] }))
    const { user } = renderDialog(gendered)
    await fill(user, {
      "Number of women's rooms": "2",
      "Number of men's rooms": "1",
      "Beds per room *": "6",
    })
    await user.click(screen.getByRole("button", { name: "Create rooms" }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post).toHaveBeenCalledWith(url, {
      json: { countFemale: 2, countMale: 1, capacity: 6, firstNumber: 8 },
    })
  })

  it("tells which numbers were skipped", async () => {
    post.mockReturnValue(respond({ created: ["8"], skipped: ["9", "10", "12"] }))
    const { user, onClose } = renderDialog()
    await fill(user, { "Number of rooms *": "4", "Beds per room *": "4" })
    await user.click(screen.getByRole("button", { name: "Create rooms" }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(notify.warning).toHaveBeenCalledWith(
      "Created: 1 room, skipped: 3 rooms (numbers 9–10, 12)",
    )
    expect(notify.success).not.toHaveBeenCalled()
  })

  it("splits 250 rooms into requests of 200 + 50 with continuous numbering", async () => {
    post
      .mockReturnValueOnce(
        respond({ created: Array.from({ length: 200 }, (_, i) => String(8 + i)), skipped: [] }),
      )
      .mockReturnValueOnce(
        respond({ created: Array.from({ length: 50 }, (_, i) => String(208 + i)), skipped: [] }),
      )
    const { user, onClose } = renderDialog()
    await fill(user, { "Number of rooms *": "250", "Beds per room *": "2" })
    await user.click(screen.getByRole("button", { name: "Create rooms" }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(post).toHaveBeenNthCalledWith(1, url, {
      json: { count: 200, capacity: 2, firstNumber: 8 },
    })
    expect(post).toHaveBeenNthCalledWith(2, url, {
      json: { count: 50, capacity: 2, firstNumber: 208 },
    })
    expect(notify.success).toHaveBeenCalledWith("Created: 250 rooms")
  })

  it("stops at a failed request, says what already exists and keeps the dialog open", async () => {
    post
      .mockReturnValueOnce(
        respond({ created: Array.from({ length: 200 }, (_, i) => String(8 + i)), skipped: [] }),
      )
      .mockReturnValueOnce(fail(new Error("Connection failed")))
    const { user, onClose, onSaved } = renderDialog()
    await fill(user, { "Number of rooms *": "450", "Beds per room *": "2" })
    await user.click(screen.getByRole("button", { name: "Create rooms" }))
    expect(await screen.findByText("Connection failed")).toBeInTheDocument()
    expect(screen.getByText("Saving was interrupted. Created: 200 rooms.")).toBeInTheDocument()
    expect(post).toHaveBeenCalledTimes(2)
    expect(onSaved).toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Number of rooms *")).toHaveValue(450)
  })

  it("keeps the entered data on an API error", async () => {
    post.mockReturnValueOnce(fail(new Error("Connection failed")))
    const { user, onClose } = renderDialog()
    await fill(user, { "Number of rooms *": "3", "Beds per room *": "4" })
    await user.click(screen.getByRole("button", { name: "Create rooms" }))
    expect(await screen.findByText("Connection failed")).toBeInTheDocument()
    expect(screen.getByLabelText("Number of rooms *")).toHaveValue(3)
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByText(/interrupted/)).not.toBeInTheDocument()
  })
})
