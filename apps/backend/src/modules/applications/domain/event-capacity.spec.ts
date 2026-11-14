import { CapacitySnapshot, computeEventCapacity } from "./event-capacity"

const rooms = (count: number, gender: "FEMALE" | "MALE" | null, capacity = 5) =>
  Array.from({ length: count }, () => ({ gender, capacity, extraBeds: 0 }))

describe("computeEventCapacity", () => {
  const snapshot: CapacitySnapshot = {
    terms: [
      {
        id: "first",
        roomMode: "GENDERED",
        rooms: [
          { gender: "FEMALE", capacity: 2, extraBeds: 0 },
          { gender: "MALE", capacity: 3, extraBeds: 0 },
        ],
        confirmed: [{ gender: "FEMALE" }, { gender: "FEMALE" }, { gender: "MALE" }],
      },
      {
        id: "second",
        roomMode: "GENDERED",
        rooms: [
          { gender: "FEMALE", capacity: 2, extraBeds: 0 },
          { gender: "MALE", capacity: 3, extraBeds: 0 },
        ],
        confirmed: [],
      },
    ],
  }

  it("computes each term from its own rooms and subtracts only its confirmations", () => {
    expect(computeEventCapacity(snapshot)).toEqual([
      {
        termId: "first",
        roomMode: "GENDERED",
        capacity: { FEMALE: 2, MALE: 3 },
        freePlaces: { FEMALE: 0, MALE: 2 },
      },
      {
        termId: "second",
        roomMode: "GENDERED",
        capacity: { FEMALE: 2, MALE: 3 },
        freePlaces: { FEMALE: 2, MALE: 3 },
      },
    ])
  })

  it("10 + 10 rooms of 5 beds hold 50 + 50, not 52 + 48", () => {
    const [term] = computeEventCapacity({
      terms: [
        {
          id: "t",
          roomMode: "GENDERED",
          rooms: [...rooms(10, "FEMALE"), ...rooms(10, "MALE")],
          confirmed: [],
        },
      ],
    })
    expect(term.capacity).toEqual({ FEMALE: 50, MALE: 50 })
    expect(term.freePlaces).toEqual({ FEMALE: 50, MALE: 50 })
  })

  it("does not let a change of rooms in one term touch another term", () => {
    const changed: CapacitySnapshot = {
      terms: [
        { ...snapshot.terms[0], rooms: [{ gender: "MALE", capacity: 5, extraBeds: 0 }] },
        snapshot.terms[1],
      ],
    }
    const [first, second] = computeEventCapacity(changed)
    expect(first.capacity).toEqual({ FEMALE: 0, MALE: 5 })
    expect(first.freePlaces).toEqual({ FEMALE: -2, MALE: 4 })
    expect(second).toEqual(computeEventCapacity(snapshot)[1])
  })

  it("lets two terms of one event differ in rooms and in mode", () => {
    const [gendered, shared] = computeEventCapacity({
      terms: [
        { id: "g", roomMode: "GENDERED", rooms: rooms(2, "FEMALE"), confirmed: [] },
        {
          id: "s",
          roomMode: "SHARED",
          rooms: rooms(3, null, 4),
          confirmed: [{ gender: "FEMALE" }, { gender: "MALE" }],
        },
      ],
    })
    expect(gendered.capacity).toEqual({ FEMALE: 10, MALE: 0 })
    expect(shared.roomMode).toBe("SHARED")
    expect(shared.capacity).toEqual({ FEMALE: 12, MALE: 12 })
    expect(shared.freePlaces).toEqual({ FEMALE: 10, MALE: 10 })
  })

  it("returns no terms for an empty event and zero capacity for a term without rooms", () => {
    expect(computeEventCapacity({ terms: [] })).toEqual([])
    const [term] = computeEventCapacity({ terms: [{ ...snapshot.terms[0], rooms: [] }] })
    expect(term.capacity).toEqual({ FEMALE: 0, MALE: 0 })
    expect(term.freePlaces).toEqual({ FEMALE: -2, MALE: -1 })
  })
})
