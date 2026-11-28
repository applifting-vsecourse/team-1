import { describe, expect, it } from "vitest"

import type { AssignmentRoom } from "@/features/events/api/room-assignments"
import {
  draftFreeBeds,
  movableBeds,
  toDraft,
  unfulfilledWishes,
} from "@/features/events/components/room-proposal"

const person = (id: string) => ({
  applicationTermId: id,
  applicationId: `a-${id}`,
  firstName: id,
  lastName: "X",
  birthYear: 2011,
  gender: "FEMALE" as const,
  individualAccommodation: false,
  accommodationRequest: null,
  status: "CONFIRMED" as const,
  wishes: [],
})
const room = (id: string, beds: number, participants: string[], gender: "FEMALE" | "MALE" | null) =>
  ({
    id,
    name: id,
    capacity: beds,
    extraBeds: 0,
    beds,
    gender,
    participants: participants.map(person),
  }) satisfies AssignmentRoom

const draft = toDraft({
  placements: [
    { applicationTermId: "a", roomId: "r1" },
    { applicationTermId: "b", roomId: "r1" },
  ],
  unplaced: [],
  wishes: [
    { applicationTermId: "a", name: "B X", matches: ["b"], fulfilled: true },
    { applicationTermId: "a", name: "Old X", matches: ["old"], fulfilled: false },
  ],
})

describe("room proposal draft", () => {
  it("counts free beds with the proposed people", () => {
    expect(draftFreeBeds(room("r1", 4, ["old"], "FEMALE"), draft)).toBe(1)
    expect(draftFreeBeds(room("r1", 2, [], "FEMALE"), draft)).toBe(0)
  })

  it("re-checks wishes after an edit, including people already in a room", () => {
    const rooms = [room("r1", 4, [], "FEMALE"), room("r2", 4, ["old"], "FEMALE")]
    expect(unfulfilledWishes(rooms, draft).map((wish) => wish.name)).toEqual(["Old X"])
    const moved = { ...draft, placements: { ...draft.placements, b: "r2" } }
    expect(unfulfilledWishes(rooms, moved).map((wish) => wish.name)).toEqual(["B X", "Old X"])
    const nextToOld = { ...draft, placements: { ...draft.placements, a: "r2", b: "r2" } }
    expect(unfulfilledWishes(rooms, nextToOld)).toEqual([])
  })

  it("offers free beds of other rooms that suit the gender, numbered after who is there", () => {
    const rooms = [
      room("r1", 3, [], "FEMALE"),
      room("r2", 3, ["old"], "FEMALE"),
      room("r3", 2, [], "MALE"),
      room("r4", 1, [], null),
    ]
    const beds = movableBeds(rooms, draft, { applicationTermId: "a", gender: "FEMALE" })
    expect(beds.map((bed) => `${bed.room.id}:${bed.number}`)).toEqual(["r2:2", "r2:3", "r4:1"])
  })

  // US-145: an individual room has no gender, but it is filled by hand only.
  it("never offers a bed of an individual room", () => {
    const rooms = [room("r2", 3, [], "FEMALE"), { ...room("r5", 4, [], null), individual: true }]
    const beds = movableBeds(rooms, draft, { applicationTermId: "a", gender: "FEMALE" })
    expect(beds.map((bed) => bed.room.id)).toEqual(["r2", "r2", "r2"])
  })
  it.each(["FEMALE", null] as const)(
    "excludes rooms occupied by a person with an individual request (room gender: %s)",
    (gender) => {
      const rooms = [
        {
          ...room("family", 3, [], gender),
          participants: [{ ...person("resident"), individualAccommodation: true }],
        },
        room("regular", 1, [], gender),
      ]
      const beds = movableBeds(rooms, draft, { applicationTermId: "a", gender: "FEMALE" })
      expect(beds.map((bed) => bed.room.id)).toEqual(["regular"])
    },
  )
})
