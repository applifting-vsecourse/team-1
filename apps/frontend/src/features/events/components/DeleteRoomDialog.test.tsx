import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { i18n } from "@/i18n"
import { footerButtonNames } from "@/test/dialog-footer"

import { roomAssignmentsKey } from "@/features/events/api/room-assignments"
import type { Room, TermRooms } from "@/features/events/api/rooms"
import { DeleteRoomDialog } from "@/features/events/components/DeleteRoomDialog"

vi.mock("@/lib/api-client", () => ({ api: {}, apiErrorCode: () => undefined }))

/** One room of `beds` beds in a term that has `total` beds before the room is deleted. */
function renderDialog(
  roomMode: TermRooms["roomMode"],
  gender: Room["gender"],
  before: number,
  beds: number,
  isIndividual = false,
  occupiedBy = { FEMALE: 0, MALE: 0 },
  isOccupied = false,
) {
  const room: Room = {
    id: "r1",
    name: "Room 1",
    capacity: beds,
    extraBeds: 0,
    beds,
    gender,
    individual: isIndividual,
    occupiedBy,
  }
  const term: TermRooms = {
    eventId: "e1",
    eventName: "Summer camp",
    organizationName: "Camp",
    termId: "t1",
    termName: "Week 1",
    startsOn: "2027-07-12",
    endsOn: "2027-07-18",
    roomMode,
    roomsPublished: false,
    rooms: [room],
    capacity: { FEMALE: before, MALE: before, total: before },
  }
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
  client.setQueryData(roomAssignmentsKey(term.eventId, term.termId), {
    rooms: [{ id: room.id, participants: isOccupied ? [{ status: "CONFIRMED" }] : [] }],
    unassigned: [],
  })
  render(
    <QueryClientProvider client={client}>
      <DeleteRoomDialog
        term={term}
        room={room}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    </QueryClientProvider>,
  )
}

afterEach(async () => {
  await act(() => i18n.changeLanguage("en"))
})

it("puts Cancel before the destructive action (#757)", () => {
  renderDialog("SHARED", "FEMALE", 6, 1)
  const names = footerButtonNames()
  expect(names).toHaveLength(2)
  expect(names[1]).toMatch(/^Delete/)
})

// The number before the noun is what the noun agrees with: what is left after the deletion.
// `from` is the Czech "from" with the number it stands before: "ze 6" but "z 9" (5 beds removed).
const left = [
  { after: 1, cs: "místo", en: "bed", from: "ze 6" },
  { after: 2, cs: "místa", en: "beds", from: "ze 7" },
  { after: 4, cs: "místa", en: "beds", from: "z 9" },
  { after: 0, cs: "míst", en: "beds", from: "z 5" },
  { after: 5, cs: "míst", en: "beds", from: "z 10" },
  { after: 22, cs: "míst", en: "beds", from: "ze 27" },
]
describe("DeleteRoomDialog capacity impact", () => {
  it.each(left)("in Czech with $after beds left", async ({ after, cs, from }) => {
    await act(() => i18n.changeLanguage("cs"))
    renderDialog("SHARED", null, 5 + after, 5)
    expect(screen.getByText(`Kapacita klesne ${from} na ${after} ${cs}`)).toBeVisible()
  })

  it.each(left)("in English with $after beds left", ({ after, en }) => {
    renderDialog("SHARED", null, 5 + after, 5)
    expect(
      screen.getByText(`Capacity will decrease from ${5 + after} to ${after} ${en}`),
    ).toBeVisible()
  })

  it.each(left)(
    "for women's rooms in Czech and English with $after beds left",
    async ({ after, cs, en, from }) => {
      renderDialog("GENDERED", "FEMALE", 5 + after, 5)
      expect(
        screen.getByText(`Women's capacity will decrease from ${5 + after} to ${after} ${en}`),
      ).toBeVisible()
      await act(() => i18n.changeLanguage("cs"))
      expect(screen.getByText(`Dámská kapacita klesne ${from} na ${after} ${cs}`)).toBeVisible()
    },
  )

  it.each(left)(
    "for men's rooms in Czech and English with $after beds left",
    async ({ after, cs, en, from }) => {
      renderDialog("GENDERED", "MALE", 5 + after, 5)
      expect(
        screen.getByText(`Men's capacity will decrease from ${5 + after} to ${after} ${en}`),
      ).toBeVisible()
      await act(() => i18n.changeLanguage("cs"))
      expect(screen.getByText(`Pánská kapacita klesne ${from} na ${after} ${cs}`)).toBeVisible()
    },
  )

  it("says „ze 3“ and „ze 2“ for the whole capacity of a room (#627)", async () => {
    await act(() => i18n.changeLanguage("cs"))
    renderDialog("SHARED", null, 3, 3)
    expect(screen.getByText("Kapacita klesne ze 3 na 0 míst")).toBeVisible()
  })

  it("keeps only the capacity warning, without repeated rows", async () => {
    await act(() => i18n.changeLanguage("cs"))
    renderDialog("GENDERED", "FEMALE", 7, 5)
    expect(screen.getByText("Dámská kapacita klesne ze 7 na 2 místa")).toBeVisible()
    expect(screen.queryByText(/má 5 míst/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Room 1 · Dámský/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Pokoj zmizí/)).not.toBeInTheDocument()
  })

  // US-145: the beds of an individual room are in the capacity only while occupied.
  it("tells how the capacity of each gender drops when an occupied individual room goes", () => {
    renderDialog("GENDERED", null, 10, 4, true, { FEMALE: 2, MALE: 1 })
    expect(
      screen.getByText("Capacity drops: women from 10 to 8, men from 10 to 9."),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Its beds counted towards the capacity only while occupied. The people in the room (3) are left without a bed.",
      ),
    ).toBeInTheDocument()
  })

  it("says the capacity stays the same when an empty individual room goes", () => {
    renderDialog("GENDERED", null, 10, 4, true)
    expect(
      screen.getByText("The room is empty, the capacity of the term stays the same."),
    ).toBeInTheDocument()
  })
})

it("explains how to empty an occupied room and disables deletion", () => {
  renderDialog("SHARED", null, 3, 1, false, undefined, true)
  expect(screen.getByText("Move the participants assigned to this room first.")).toBeVisible()
  expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled()
  expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled()
})
