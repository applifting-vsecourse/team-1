import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { EventRooms, RoomMode } from "@/features/events/api/rooms"
import { RoomModeDialog } from "@/features/events/components/RoomModeDialog"

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { patch }, apiErrorCode: () => undefined }))

const event: EventRooms = {
  eventId: "e1",
  eventName: "Summer camp",
  organizationName: "Camp",
  roomMode: "GENDERED",
  termCount: 2,
  rooms: [{ id: "r1", name: "12", capacity: 5, gender: "FEMALE" }],
  capacity: { FEMALE: 5, MALE: 0, total: 5 },
}
const renderDialog = (data = event, targetMode: RoomMode = "SHARED") => {
  const onClose = vi.fn()
  const onSaved = vi.fn().mockResolvedValue(undefined)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RoomModeDialog
        event={data}
        targetMode={targetMode}
        onClose={onClose}
        onSaved={onSaved}
      />
    </QueryClientProvider>,
  )
  return { onClose, onSaved, user: userEvent.setup() }
}

describe("room mode confirmation", () => {
  beforeEach(() => patch.mockReset())

  it("explains the impact and keeps the original mode when cancelled", async () => {
    const { user, onClose } = renderDialog()
    expect(screen.getByText("Room genders will be removed")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Keep current mode" })).toHaveFocus()
    expect(patch).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Keep current mode" }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(patch).not.toHaveBeenCalled()
  })

  it("submits only after confirmation and refreshes before closing", async () => {
    patch.mockResolvedValue(undefined)
    const { user, onSaved, onClose } = renderDialog()
    expect(patch).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Change mode" }))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(patch).toHaveBeenCalledExactlyOnceWith("organizer/events/e1/room-mode", {
      json: { roomMode: "SHARED" },
    })
    expect(onSaved).toHaveBeenCalledOnce()
    expect(onSaved.mock.invocationCallOrder[0] ?? Infinity).toBeLessThan(
      onClose.mock.invocationCallOrder[0] ?? -Infinity,
    )
  })

  it("explains why shared rooms block the change without making a failing request", async () => {
    const { user, onClose } = renderDialog(
      {
        ...event,
        roomMode: "SHARED",
        rooms: [{ id: "r1", name: "12", capacity: 5, gender: null }],
      },
      "GENDERED",
    )
    expect(screen.getByRole("heading", { name: "Remove shared rooms first" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Change mode" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Got it" }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(patch).not.toHaveBeenCalled()
  })

  it("allows confirming gendered mode when shared rooms are empty", async () => {
    patch.mockResolvedValue(undefined)
    const { user } = renderDialog({ ...event, roomMode: "SHARED", rooms: [] }, "GENDERED")
    expect(screen.getByText("New rooms will require a gender")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Change mode" }))
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("organizer/events/e1/room-mode", {
        json: { roomMode: "GENDERED" },
      }),
    )
  })

  it("disables repeat confirmation and closing while saving", async () => {
    let finish: (() => void) | undefined
    patch.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve
      }),
    )
    const { user, onClose } = renderDialog()
    const confirm = screen.getByRole("button", { name: "Change mode" })
    await user.click(confirm)
    expect(confirm).toBeDisabled()
    expect(screen.getByRole("button", { name: "Keep current mode" })).toBeDisabled()
    await user.keyboard("{Escape}")
    await user.click(confirm)
    expect(onClose).not.toHaveBeenCalled()
    expect(patch).toHaveBeenCalledOnce()
    finish?.()
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it("keeps the dialog open on failure and allows retry", async () => {
    patch.mockRejectedValueOnce(new Error("Connection failed")).mockResolvedValueOnce(undefined)
    const { user, onClose } = renderDialog()
    await user.click(screen.getByRole("button", { name: "Change mode" }))
    expect(await screen.findByText("Connection failed")).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Change mode" }))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })
})
