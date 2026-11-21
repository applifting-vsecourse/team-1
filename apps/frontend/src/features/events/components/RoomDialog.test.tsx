import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { TermRooms } from "@/features/events/api/rooms"
import { RoomDialog } from "@/features/events/components/RoomDialog"

// Radix's radio group measures things jsdom doesn't have.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)

const { post, put } = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { post, put }, apiErrorCode: () => undefined }))

const event: TermRooms = {
  eventId: "e1",
  eventName: "Summer camp",
  organizationName: "Camp",
  termId: "t1",
  termName: "Week 1",
  startsOn: "2027-07-19",
  endsOn: "2027-07-25",
  roomMode: "GENDERED",
  roomsPublished: false,
  rooms: [],
  capacity: { FEMALE: 0, MALE: 0, total: 0 },
}
const renderDialog = (data = event, room?: TermRooms["rooms"][number]) => {
  const onClose = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RoomDialog
        term={data}
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

  it("changes the form value using the room stepper and respects the minimum", async () => {
    const { user } = renderDialog()
    const down = screen.getByRole("button", { name: "Decrease bed count" })
    const up = screen.getByRole("button", { name: "Increase bed count" })
    expect(down).toBeDisabled()
    await user.click(up)
    expect(screen.getByLabelText("Capacity *")).toHaveValue(1)
    expect(down).toBeDisabled()
    await user.click(up)
    expect(down).toBeEnabled()
    await user.click(down)
    expect(screen.getByLabelText("Capacity *")).toHaveValue(1)
    expect(post).not.toHaveBeenCalled()
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
    expect(post).toHaveBeenCalledWith("organizer/events/e1/terms/t1/rooms", {
      json: { name: "12", capacity: 100, gender: null, individual: false },
    })
  })

  // US-145
  it("saves an individual room without a gender and hides the gender while it is on", async () => {
    post.mockResolvedValue(undefined)
    const { user, onClose } = renderDialog()
    expect(screen.getByRole("combobox")).toBeInTheDocument()
    await user.type(screen.getByLabelText("Room name *"), "Family")
    await user.type(screen.getByLabelText("Capacity *"), "4")
    await user.click(screen.getByRole("checkbox", { name: "Individual (mixed) room" }))
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
    expect(
      screen.getByText("You can assign confirmed participants to this room regardless of gender."),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Add room" }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(post).toHaveBeenCalledWith("organizer/events/e1/terms/t1/rooms", {
      json: { name: "Family", capacity: 4, gender: null, individual: true },
    })
  })

  it("clears the flag of an individual room and sends a gender again", async () => {
    put.mockResolvedValue(undefined)
    const room = {
      id: "r1",
      name: "Family",
      capacity: 4,
      extraBeds: 0,
      beds: 4,
      gender: null,
      individual: true,
    }
    const { user, onClose } = renderDialog(event, room)
    const checkbox = screen.getByRole("checkbox", { name: "Individual (mixed) room" })
    expect(checkbox).toBeChecked()
    await user.click(checkbox)
    await user.click(screen.getByRole("button", { name: "Save changes" }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(put).toHaveBeenCalledWith("organizer/events/e1/terms/t1/rooms/r1", {
      json: { name: "Family", capacity: 4, gender: "FEMALE", individual: false },
    })
  })

  it("does not offer the individual room in a term with shared rooms", () => {
    renderDialog({ ...event, roomMode: "SHARED" })
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
  })

  it("keeps entered data on an API error and allows retry", async () => {
    put.mockRejectedValueOnce(new Error("Connection failed")).mockResolvedValueOnce(undefined)
    const room = {
      id: "r1",
      name: "12",
      capacity: 5,
      extraBeds: 0,
      beds: 5,
      gender: "FEMALE" as const,
    }
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
