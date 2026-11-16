import { computeEventOccupancy, EventOccupancySource } from "./occupancy"

const term = { id: "t1", name: "Turnus 1", startsOn: "2027-07-12", endsOn: "2027-07-18" }

describe("computeEventOccupancy", () => {
  it("separates women and men in gendered rooms", () => {
    const source: EventOccupancySource = {
      eventId: "e1",
      terms: [
        {
          ...term,
          roomMode: "GENDERED",
          rooms: [
            { capacity: 5, extraBeds: 0, gender: "FEMALE" },
            { capacity: 5, extraBeds: 0, gender: "FEMALE" },
            { capacity: 4, extraBeds: 0, gender: "MALE" },
          ],
          confirmed: ["FEMALE", "FEMALE", "MALE", "MALE", "MALE", "MALE"],
          waitlisted: ["MALE", "MALE", "FEMALE"],
        },
      ],
    }
    const { terms } = computeEventOccupancy(source)
    expect(terms[0].roomCount).toBe(3)
    expect(terms[0].byGender).toEqual({
      FEMALE: { capacity: 10, confirmed: 2, free: 8, waitlisted: 1 },
      MALE: { capacity: 4, confirmed: 4, free: 0, waitlisted: 2 },
    })
    expect(terms[0]).toMatchObject({ capacity: 14, confirmed: 6, free: 8, waitlisted: 3 })
  })

  it("keeps one pool for shared rooms and counts a bed once", () => {
    const pool = {
      roomMode: "SHARED" as const,
      rooms: [
        { capacity: 6, extraBeds: 0, gender: null },
        { capacity: 4, extraBeds: 0, gender: null },
      ],
    }
    const { terms } = computeEventOccupancy({
      eventId: "e1",
      terms: [
        { ...term, ...pool, confirmed: ["FEMALE", "MALE", "MALE"], waitlisted: ["FEMALE"] },
        { ...term, ...pool, id: "t2", confirmed: [], waitlisted: [] },
      ],
    })
    expect(terms[0]).toMatchObject({
      capacity: 10,
      confirmed: 3,
      free: 7,
      waitlisted: 1,
      byGender: null,
    })
    expect(terms[1]).toMatchObject({ capacity: 10, confirmed: 0, free: 10, waitlisted: 0 })
  })

  it("shows an overbooked term with negative free places", () => {
    const { terms } = computeEventOccupancy({
      eventId: "e1",
      terms: [
        {
          ...term,
          roomMode: "SHARED",
          rooms: [{ capacity: 1, extraBeds: 0, gender: null }],
          confirmed: ["FEMALE", "MALE"],
          waitlisted: [],
        },
      ],
    })
    expect(terms[0].free).toBe(-1)
  })

  it("computes two terms of one event from their own rooms and modes (US-99)", () => {
    const { terms } = computeEventOccupancy({
      eventId: "e1",
      terms: [
        {
          ...term,
          roomMode: "GENDERED",
          rooms: [{ capacity: 5, extraBeds: 0, gender: "FEMALE" }],
          confirmed: [],
          waitlisted: [],
        },
        {
          ...term,
          id: "t2",
          roomMode: "SHARED",
          rooms: [{ capacity: 8, extraBeds: 0, gender: null }],
          confirmed: ["MALE"],
          waitlisted: [],
        },
      ],
    })
    expect(terms[0]).toMatchObject({ roomMode: "GENDERED", roomCount: 1, capacity: 5 })
    expect(terms[1]).toMatchObject({ roomMode: "SHARED", roomCount: 1, capacity: 8, free: 7 })
  })

  it("handles a term without rooms", () => {
    const { terms } = computeEventOccupancy({
      eventId: "e1",
      terms: [{ ...term, roomMode: "GENDERED", rooms: [], confirmed: [], waitlisted: ["MALE"] }],
    })
    expect(terms[0]).toMatchObject({ capacity: 0, confirmed: 0, free: 0, waitlisted: 1 })
  })
})
