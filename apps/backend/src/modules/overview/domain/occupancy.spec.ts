import { computeEventOccupancy, EventOccupancySource } from "./occupancy"

const term = { id: "t1", name: "Turnus 1", startsOn: "2027-07-12", endsOn: "2027-07-18" }

describe("computeEventOccupancy", () => {
  it("separates women and men in gendered rooms", () => {
    const source: EventOccupancySource = {
      eventId: "e1",
      roomMode: "GENDERED",
      rooms: [
        { capacity: 5, gender: "FEMALE" },
        { capacity: 5, gender: "FEMALE" },
        { capacity: 4, gender: "MALE" },
      ],
      terms: [
        {
          ...term,
          confirmed: ["FEMALE", "FEMALE", "MALE", "MALE", "MALE", "MALE"],
          waitlisted: ["MALE", "MALE", "FEMALE"],
        },
      ],
    }
    const { terms, roomCount } = computeEventOccupancy(source)
    expect(roomCount).toBe(3)
    expect(terms[0].byGender).toEqual({
      FEMALE: { capacity: 10, confirmed: 2, free: 8, waitlisted: 1 },
      MALE: { capacity: 4, confirmed: 4, free: 0, waitlisted: 2 },
    })
    expect(terms[0]).toMatchObject({ capacity: 14, confirmed: 6, free: 8, waitlisted: 3 })
  })

  it("keeps one pool for shared rooms and counts a bed once", () => {
    const { terms } = computeEventOccupancy({
      eventId: "e1",
      roomMode: "SHARED",
      rooms: [
        { capacity: 6, gender: null },
        { capacity: 4, gender: null },
      ],
      terms: [
        { ...term, confirmed: ["FEMALE", "MALE", "MALE"], waitlisted: ["FEMALE"] },
        { ...term, id: "t2", confirmed: [], waitlisted: [] },
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
      roomMode: "SHARED",
      rooms: [{ capacity: 1, gender: null }],
      terms: [{ ...term, confirmed: ["FEMALE", "MALE"], waitlisted: [] }],
    })
    expect(terms[0].free).toBe(-1)
  })

  it("handles an event without rooms", () => {
    const { terms } = computeEventOccupancy({
      eventId: "e1",
      roomMode: "GENDERED",
      rooms: [],
      terms: [{ ...term, confirmed: [], waitlisted: ["MALE"] }],
    })
    expect(terms[0]).toMatchObject({ capacity: 0, confirmed: 0, free: 0, waitlisted: 1 })
  })
})
