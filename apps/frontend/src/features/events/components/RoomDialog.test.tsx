import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { EventRooms } from "@/features/events/api/rooms"
import { RoomDialog } from "@/features/events/components/RoomDialog"

const { post, put } = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { post, put }, apiErrorCode: () => undefined }))

const event: EventRooms = {
  eventId: "e1",
  eventName: "Summer camp",
  organizationName: "Camp",
  roomMode: "GENDERED",
  termCount: 2,
  rooms: [],
  capacity: { FEMALE: 0, MALE: 0, total: 0 },
}
const renderDialog = (data = event, room?: EventRooms["rooms"][number]) => {
  const onClose = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RoomDialog
        event={data}
        room={room}
        onClose={onClose}
        onSaved={() => Promise.resolve()}
        onDelete={vi.fn()}
      />
    </QueryClientProvider>,
  )
  return { onClose, user: userEvent.setup() }
}

describe("room form", () => {
  beforeEach(() => {
    post.mockReset()
    put.mockReset()
  })

  it("keeps invalid capacity in the form and focuses it without sending", async () => {
    const { user } = renderDialog()
    await user.type(screen.getByLabelText("Room name *"), "12")
    await user.type(screen.getByLabelText("Capacity *"), "0")
    await user.click(screen.getByRole("button", { name: "Add room" }))
    expect(await screen.findByText("Enter a whole number of at least 1.")).toBeInTheDocument()
    expect(screen.getByLabelText("Capacity *")).toHaveValue(0)
    expect(screen.getByLabelText("Capacity *")).toHaveFocus()
    expect(post).not.toHaveBeenCalled()
  })

  it("saves a shared room without a gender and closes after success", async () => {
    post.mockResolvedValue(undefined)
    const { user, onClose } = renderDialog({ ...event, roomMode: "SHARED" })
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
    await user.type(screen.getByLabelText("Room name *"), " 12 ")
    await user.type(screen.getByLabelText("Capacity *"), "100")
    await user.click(screen.getByRole("button", { name: "Add room" }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(post).toHaveBeenCalledWith("organizer/events/e1/rooms", {
      json: { name: "12", capacity: 100, gender: null },
    })
  })

  it("keeps entered data on an API error and allows retry", async () => {
    put.mockRejectedValueOnce(new Error("Connection failed")).mockResolvedValueOnce(undefined)
    const room = { id: "r1", name: "12", capacity: 5, gender: "FEMALE" as const }
    const { user, onClose } = renderDialog(event, room)
    await user.clear(screen.getByLabelText("Capacity *"))
    await user.type(screen.getByLabelText("Capacity *"), "21")
    await user.click(screen.getByRole("button", { name: "Save changes" }))
    expect(await screen.findByText("Connection failed")).toBeInTheDocument()
    expect(screen.getByLabelText("Capacity *")).toHaveValue(21)
    expect(onClose).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Save changes" }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it("blocks duplicate submissions while the request is pending", async () => {
    let finish: (() => void) | undefined
    post.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve
      }),
    )
    const { user } = renderDialog()
    await user.type(screen.getByLabelText("Room name *"), "12")
    await user.type(screen.getByLabelText("Capacity *"), "100")
    const button = screen.getByRole("button", { name: "Add room" })
    await user.click(button)
    expect(button).toBeDisabled()
    await user.click(button)
    expect(post).toHaveBeenCalledTimes(1)
    finish?.()
    await waitFor(() => expect(button).not.toBeDisabled())
  })
})
