import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { i18n } from "@/i18n"

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
  render(
    <QueryClientProvider client={new QueryClient()}>
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

// The number before the noun is what the noun agrees with: what is left after the deletion.
const left = [
  { after: 1, cs: "místo", en: "bed" },
  { after: 2, cs: "místa", en: "beds" },
  { after: 4, cs: "místa", en: "beds" },
  { after: 0, cs: "míst", en: "beds" },
  { after: 5, cs: "míst", en: "beds" },
  { after: 22, cs: "míst", en: "beds" },
]
const removed = [
  { beds: 1, cs: "místo", en: "bed" },
  { beds: 3, cs: "místa", en: "beds" },
  { beds: 8, cs: "míst", en: "beds" },
]

describe("DeleteRoomDialog capacity impact", () => {
  it.each(left)("in Czech with $after beds left", async ({ after, cs }) => {
    await act(() => i18n.changeLanguage("cs"))
    renderDialog("SHARED", null, 5 + after, 5)
    expect(screen.getByText(`Kapacita klesne z ${5 + after} na ${after} ${cs}`)).toBeVisible()
  })

  it.each(left)("in English with $after beds left", ({ after, en }) => {
    renderDialog("SHARED", null, 5 + after, 5)
    expect(
      screen.getByText(`Capacity will decrease from ${5 + after} to ${after} ${en}`),
    ).toBeVisible()
  })

  it.each(left)(
    "for women's rooms in Czech and English with $after beds left",
    async ({ after, cs, en }) => {
      renderDialog("GENDERED", "FEMALE", 5 + after, 5)
      expect(
        screen.getByText(`Women's capacity will decrease from ${5 + after} to ${after} ${en}`),
      ).toBeVisible()
      await act(() => i18n.changeLanguage("cs"))
      expect(
        screen.getByText(`Dámská kapacita klesne z ${5 + after} na ${after} ${cs}`),
      ).toBeVisible()
    },
  )

  it.each(left)(
    "for men's rooms in Czech and English with $after beds left",
    async ({ after, cs, en }) => {
      renderDialog("GENDERED", "MALE", 5 + after, 5)
      expect(
        screen.getByText(`Men's capacity will decrease from ${5 + after} to ${after} ${en}`),
      ).toBeVisible()
      await act(() => i18n.changeLanguage("cs"))
      expect(
        screen.getByText(`Pánská kapacita klesne z ${5 + after} na ${after} ${cs}`),
      ).toBeVisible()
    },
  )

  it.each(removed)("agrees the hint with a room of $beds beds", async ({ beds, cs, en }) => {
    renderDialog("SHARED", null, 20, beds)
    expect(
      screen.getByText(
        `Room 1 has ${beds} ${en}. Deleting it recalculates the capacity of this term only.`,
      ),
    ).toBeVisible()
    await act(() => i18n.changeLanguage("cs"))
    expect(
      screen.getByText(`Room 1 má ${beds} ${cs}. Smazání přepočítá kapacitu pouze tohoto termínu.`),
    ).toBeVisible()
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
