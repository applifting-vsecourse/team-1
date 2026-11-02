import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { RoomMode, TermRooms } from "@/features/events/api/rooms"
import { RoomModeDialog } from "@/features/events/components/RoomModeDialog"

// Radix's radio group measures things jsdom doesn't have.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { patch }, apiErrorCode: () => undefined }))

const base: TermRooms = {
  eventId: "e1",
  eventName: "Summer camp",
  organizationName: "Camp",
  termId: "t1",
  termName: "Week",
  startsOn: "2027-08-02",
  endsOn: "2027-08-08",
  roomMode: "GENDERED",
  rooms: [{ id: "r1", name: "12", capacity: 5, gender: "FEMALE" }],
  capacity: { FEMALE: 5, MALE: 0, total: 5 },
}
const shared: TermRooms = {
  ...base,
  roomMode: "SHARED",
  rooms: [
    { id: "r1", name: "12", capacity: 5, gender: null },
    { id: "r2", name: "13", capacity: 4, gender: null },
  ],
}
const renderDialog = (term: TermRooms, targetMode: RoomMode) => {
  const onClose = vi.fn()
  const onSaved = vi.fn().mockResolvedValue(undefined)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RoomModeDialog
        term={term}
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
    const { user, onClose } = renderDialog(base, "SHARED")
    expect(screen.getByText("Room genders will be removed")).toBeInTheDocument()
    expect(screen.getByText(/applies only to the selected term/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Keep current mode" })).toHaveFocus()
    await user.click(screen.getByRole("button", { name: "Keep current mode" }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(patch).not.toHaveBeenCalled()
  })

  it("submits to the term only after confirmation and refreshes before closing", async () => {
    patch.mockResolvedValue(undefined)
    const { user, onSaved, onClose } = renderDialog(base, "SHARED")
    expect(patch).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Change mode" }))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(patch).toHaveBeenCalledExactlyOnceWith("organizer/events/e1/terms/t1/room-mode", {
      json: { roomMode: "SHARED", rooms: [] },
    })
    expect(onSaved.mock.invocationCallOrder[0] ?? Infinity).toBeLessThan(
      onClose.mock.invocationCallOrder[0] ?? -Infinity,
    )
  })

  it("asks for a gender of every existing room before switching to gendered rooms", async () => {
    patch.mockResolvedValue(undefined)
    const { user, onClose } = renderDialog(shared, "GENDERED")
    const confirm = screen.getByRole("button", { name: "Change mode" })
    expect(confirm).toBeDisabled()
    await user.click(
      within(screen.getByRole("group", { name: /12/ })).getByRole("radio", { name: "Women's" }),
    )
    expect(confirm).toBeDisabled()
    await user.click(
      within(screen.getByRole("group", { name: /13/ })).getByRole("radio", { name: "Men's" }),
    )
    await user.click(confirm)
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(patch).toHaveBeenCalledExactlyOnceWith("organizer/events/e1/terms/t1/room-mode", {
      json: {
        roomMode: "GENDERED",
        rooms: [
          { id: "r1", gender: "FEMALE" },
          { id: "r2", gender: "MALE" },
        ],
      },
    })
  })

  it("allows confirming gendered mode when the term has no rooms", async () => {
    patch.mockResolvedValue(undefined)
    const { user } = renderDialog({ ...shared, rooms: [] }, "GENDERED")
    expect(screen.getByText("New rooms will require a gender")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Change mode" }))
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("organizer/events/e1/terms/t1/room-mode", {
        json: { roomMode: "GENDERED", rooms: [] },
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
    const { user, onClose } = renderDialog(base, "SHARED")
    const confirm = screen.getByRole("button", { name: "Change mode" })
    await user.click(confirm)
    expect(confirm).toBeDisabled()
    expect(screen.getByRole("button", { name: "Keep current mode" })).toBeDisabled()
    await user.keyboard("{Escape}")
    expect(onClose).not.toHaveBeenCalled()
    expect(patch).toHaveBeenCalledOnce()
    finish?.()
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it("keeps the dialog open on failure and allows retry", async () => {
    patch.mockRejectedValueOnce(new Error("Connection failed")).mockResolvedValueOnce(undefined)
    const { user, onClose } = renderDialog(base, "SHARED")
    await user.click(screen.getByRole("button", { name: "Change mode" }))
    expect(await screen.findByText("Connection failed")).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Change mode" }))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })
})
