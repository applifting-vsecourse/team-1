import { describe, expect, it } from "vitest"

import { sortRoomsForAssignment } from "@/features/events/components/room-assignment-labels"

const room = (name: string, gender: "FEMALE" | "MALE" | null, beds: number, taken = 0) => ({
  name,
  gender,
  beds,
  participants: Array.from({ length: taken }, () => ({}) as never),
})

describe("sortRoomsForAssignment", () => {
  const rooms = [
    room("A1", "FEMALE", 4),
    room("A2", "FEMALE", 4),
    room("B1", "MALE", 2, 1),
    room("B2", "MALE", 4, 1),
    room("B3", "MALE", 2, 2),
    room("B4", "MALE", 3, 1),
    room("C1", null, 4),
  ]

  it("puts rooms of the participant's gender first, most free beds first, full ones last", () => {
    expect(sortRoomsForAssignment(rooms, "MALE").map((r) => r.name)).toEqual([
      "B2",
      "B4",
      "B1",
      "B3",
      "C1",
      "A1",
      "A2",
    ])
  })

  it("does the same the other way round and breaks ties by name", () => {
    expect(sortRoomsForAssignment(rooms, "FEMALE").map((r) => r.name)).toEqual([
      "A1",
      "A2",
      "C1",
      "B2",
      "B4",
      "B1",
      "B3",
    ])
  })

  it("does not change the given list", () => {
    const input = [room("Z", "MALE", 2), room("A", "MALE", 2)]
    sortRoomsForAssignment(input, "MALE")
    expect(input.map((r) => r.name)).toEqual(["Z", "A"])
  })
})
