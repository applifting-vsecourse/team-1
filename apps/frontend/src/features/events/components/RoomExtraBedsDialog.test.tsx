import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Room, TermRooms } from "@/features/events/api/rooms"
import { RoomExtraBedsDialog } from "@/features/events/components/RoomExtraBedsDialog"

const { put, patch, post } = vi.hoisted(() => ({ put: vi.fn(), patch: vi.fn(), post: vi.fn() }))
vi.mock("@/lib/api-client", () => ({
  api: { put, patch, post },
  apiErrorCode: () => undefined,
}))

const term = {
  eventId: "e1",
  termId: "t1",
  startsOn: "2027-07-12",
  endsOn: "2027-07-18",
} as TermRooms
const room: Room = {
  id: "r1",
  name: "Room 1",
  capacity: 4,
  extraBeds: 0,
  beds: 4,
  gender: "FEMALE",
}

function renderDialog() {
  const onSaved = vi.fn().mockResolvedValue(undefined)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RoomExtraBedsDialog
        term={term}
        room={room}
        onClose={vi.fn()}
        onSaved={onSaved}
      />
    </QueryClientProvider>,
  )
  return {
    field: screen.getByLabelText<HTMLInputElement>("Number of extra beds"),
    onSaved,
  }
}

describe("RoomExtraBedsDialog – extra beds field", () => {
  beforeEach(() => {
    put.mockReset().mockResolvedValue(undefined)
    patch.mockReset().mockResolvedValue(undefined)
    post.mockReset().mockResolvedValue(undefined)
  })

  it("has a minimum of 1", () => {
    const { field } = renderDialog()
    expect(field).toHaveAttribute("min", "1")
  })

  it("does not accept a minus sign or exponent characters when typing", async () => {
    const { field } = renderDialog()
    await userEvent.type(field, "-5")
    expect(field).toHaveValue(5)
    await userEvent.clear(field)
    await userEvent.type(field, "+e2E")
    expect(field).toHaveValue(2)
  })

  it("does not paste a negative or non-numeric value", async () => {
    const { field } = renderDialog()
    await userEvent.click(field)
    await userEvent.paste("-3")
    expect(field).toHaveValue(null)
    await userEvent.paste("abc")
    expect(field).toHaveValue(null)
    await userEvent.paste("3")
    expect(field).toHaveValue(3)
  })

  it.each([
    ["", ""],
    ["0", "0"],
    ["1.5", "1.5"],
    ["2147483648", "2147483648"],
  ])("still shows the validation error for %j", async (_name, typed) => {
    const { field } = renderDialog()
    if (typed) await userEvent.type(field, typed)
    await userEvent.click(screen.getByRole("button", { name: /save/i }))
    expect(await screen.findByText("Enter a whole number, at least 1.")).toBeInTheDocument()
  })
})
