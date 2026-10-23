import { CapacitySnapshot, computeEventCapacity } from "./event-capacity"

describe("computeEventCapacity", () => {
  const snapshot: CapacitySnapshot = {
    rooms: [
      { gender: "FEMALE", capacity: 2 },
      { gender: "MALE", capacity: 3 },
    ],
    terms: [
      { id: "first", confirmed: [{ gender: "FEMALE" }, { gender: "FEMALE" }, { gender: "MALE" }] },
      { id: "second", confirmed: [] },
    ],
  }

  it("shares event capacity but subtracts only each term's confirmations", () => {
    expect(computeEventCapacity(snapshot)).toEqual([
      { termId: "first", capacity: { FEMALE: 2, MALE: 3 }, freePlaces: { FEMALE: 0, MALE: 2 } },
      { termId: "second", capacity: { FEMALE: 2, MALE: 3 }, freePlaces: { FEMALE: 2, MALE: 3 } },
    ])
  })

  it("recomputes all terms after a room changes gender without moving confirmations", () => {
    const changed = { ...snapshot, rooms: [{ gender: "MALE" as const, capacity: 5 }] }
    expect(computeEventCapacity(changed)).toEqual([
      { termId: "first", capacity: { FEMALE: 0, MALE: 5 }, freePlaces: { FEMALE: -2, MALE: 4 } },
      { termId: "second", capacity: { FEMALE: 0, MALE: 5 }, freePlaces: { FEMALE: 0, MALE: 5 } },
    ])
  })

  it("returns no terms for an empty event and zero capacity without rooms", () => {
    expect(computeEventCapacity({ rooms: [], terms: [] })).toEqual([])
    expect(computeEventCapacity({ ...snapshot, rooms: [] })[0].freePlaces).toEqual({
      FEMALE: -2,
      MALE: -1,
    })
  })
})
