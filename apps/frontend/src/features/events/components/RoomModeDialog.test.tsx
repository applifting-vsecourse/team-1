import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { TermRooms } from "@/features/events/api/rooms"
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

const shared: TermRooms = {
  eventId: "e1",
  eventName: "Summer camp",
  organizationName: "Camp",
  termId: "t1",
  termName: "Week",
  startsOn: "2027-08-02",
  endsOn: "2027-08-08",
  roomMode: "SHARED",
  rooms: [
    { id: "r1", name: "Room 201", capacity: 6, gender: null },
    { id: "r2", name: "Room 202", capacity: 4, gender: null },
  ],
  capacity: { FEMALE: 0, MALE: 0, total: 10 },
}
const gendered: TermRooms = {
  ...shared,
  roomMode: "GENDERED",
  rooms: [
    { id: "r1", name: "Room 201", capacity: 6, gender: "FEMALE" },
    { id: "r2", name: "Room 202", capacity: 4, gender: "MALE" },
  ],
  capacity: { FEMALE: 6, MALE: 4, total: 10 },
}
const renderDialog = (term: TermRooms) => {
  const onClose = vi.fn()
  const onSaved = vi.fn().mockResolvedValue(undefined)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RoomModeDialog
        term={term}
        onClose={onClose}
        onSaved={onSaved}
      />
    </QueryClientProvider>,
  )
  return { onClose, onSaved, user: userEvent.setup() }
}

describe("room mode dialog", () => {
  beforeEach(() => patch.mockReset())

  it("shows the term, the current mode and the capacity before and after", () => {
    renderDialog(shared)
    expect(screen.getByText("2–8 Aug 2027")).toBeInTheDocument()
    expect(screen.getByText("Current mode")).toBeInTheDocument()
    expect(screen.getByText("10 shared beds")).toBeInTheDocument()
    expect(screen.getByText("0 women's + 0 men's beds")).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "By gender" })).toBeChecked()
    expect(screen.getByText("The change applies only to the term 2–8 Aug 2027.")).toBeVisible()
  })

  it("asks for a gender of every room and splits the capacity by the choice", async () => {
    patch.mockResolvedValue(undefined)
    const { user, onClose, onSaved } = renderDialog(shared)
    const confirm = screen.getByRole("button", { name: "Change mode" })
    expect(confirm).toBeDisabled()
    const first = screen.getByRole("group", { name: /Room 201/ })
    await user.click(within(first).getByRole("radio", { name: "Women's" }))
    expect(confirm).toBeDisabled()
    const second = screen.getByRole("group", { name: /Room 202/ })
    await user.click(within(second).getByRole("radio", { name: "Men's" }))
    expect(screen.getByText("6 women's + 4 men's beds")).toBeInTheDocument()
    expect(patch).not.toHaveBeenCalled()
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
    expect(onSaved.mock.invocationCallOrder[0] ?? Infinity).toBeLessThan(
      onClose.mock.invocationCallOrder[0] ?? -Infinity,
    )
  })

  it("changes nothing when cancelled", async () => {
    const { user, onClose } = renderDialog(shared)
    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(patch).not.toHaveBeenCalled()
  })

  it("switches gendered rooms to shared rooms without assigning anything", async () => {
    patch.mockResolvedValue(undefined)
    const { user, onClose } = renderDialog(gendered)
    expect(screen.getByText("6 women's + 4 men's beds")).toBeInTheDocument()
    expect(screen.getByText("10 shared beds")).toBeInTheDocument()
    expect(screen.queryByText("Assign each room")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Change mode" }))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(patch).toHaveBeenCalledExactlyOnceWith("organizer/events/e1/terms/t1/room-mode", {
      json: { roomMode: "SHARED", rooms: [] },
    })
  })

  it("explains the change of an empty term and creates no capacity", async () => {
    patch.mockResolvedValue(undefined)
    const { user } = renderDialog({
      ...shared,
      rooms: [],
      capacity: { FEMALE: 0, MALE: 0, total: 0 },
    })
    expect(screen.getByText("0 rooms · 0 beds")).toBeInTheDocument()
    expect(screen.getByText(/Changing the mode alone creates no capacity/)).toBeInTheDocument()
    expect(screen.getByText(/The other terms stay as they are/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Change mode" }))
    await waitFor(() => expect(patch).toHaveBeenCalledOnce())
  })

  it("disables repeat confirmation and closing while saving", async () => {
    let finish: (() => void) | undefined
    patch.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve
      }),
    )
    const { user, onClose } = renderDialog(gendered)
    const confirm = screen.getByRole("button", { name: "Change mode" })
    await user.click(confirm)
    expect(confirm).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    await user.keyboard("{Escape}")
    expect(onClose).not.toHaveBeenCalled()
    expect(patch).toHaveBeenCalledOnce()
    finish?.()
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it("keeps the dialog open on failure and allows retry", async () => {
    patch.mockRejectedValueOnce(new Error("Connection failed")).mockResolvedValueOnce(undefined)
    const { user, onClose } = renderDialog(gendered)
    await user.click(screen.getByRole("button", { name: "Change mode" }))
    expect(await screen.findByText("Connection failed")).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Change mode" }))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })
})
