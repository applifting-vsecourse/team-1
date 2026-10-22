import { Gender } from "@/shared/domain/gender"
import {
  computeFreePlaces,
  computeTermCapacity,
  computeTotalBeds,
  countByGender,
  RoomCapacity,
} from "./capacity"
import { evaluateQueue } from "./evaluation"

const rooms = (count: number, capacity: number, gender: Gender): RoomCapacity[] =>
  Array.from({ length: count }, () => ({ capacity, gender }))

// Brief, p. 1: ten women's and ten men's rooms of five beds each.
const briefRooms = [...rooms(10, 5, "FEMALE"), ...rooms(10, 5, "MALE")]
const applicants = (women: number, men: number): Gender[] => [
  ...Array<Gender>(women).fill("FEMALE"),
  ...Array<Gender>(men).fill("MALE"),
]

describe("computeTermCapacity", () => {
  it("sums women’s and men’s rooms separately", () => {
    expect(computeTermCapacity(briefRooms)).toEqual({ FEMALE: 50, MALE: 50 })
  })

  it("is zero for a gender without rooms", () => {
    expect(computeTermCapacity(rooms(2, 4, "MALE"))).toEqual({
      FEMALE: 0,
      MALE: 8,
    })
  })
})

describe("computeTotalBeds", () => {
  it("adds women’s and men’s beds", () => {
    expect(computeTotalBeds(briefRooms)).toBe(100)
  })

  it("is zero without rooms", () => {
    expect(computeTotalBeds([])).toBe(0)
  })
})

describe("brief example: 10 + 10 rooms of 5 beds", () => {
  const capacity = computeTermCapacity(briefRooms)

  it("fits 50 women + 50 men", () => {
    const statuses = evaluateQueue(capacity, applicants(50, 50))
    expect(statuses.every((status) => status === "CONFIRMED")).toBe(true)
  })

  it("does not fit 52 women + 48 men — two women are waitlisted", () => {
    const queue = applicants(52, 48)
    const statuses = evaluateQueue(capacity, queue)

    const confirmed = queue.filter((_, index) => statuses[index] === "CONFIRMED")
    expect(countByGender(confirmed.map((gender) => ({ gender })))).toEqual({
      FEMALE: 50,
      MALE: 48,
    })
    // The two waitlisted are the last women to arrive.
    expect(statuses.slice(50, 52)).toEqual(["WAITLISTED", "WAITLISTED"])
  })

  it("keeps confirming men while women are full", () => {
    const statuses = evaluateQueue(capacity, [...applicants(51, 0), "MALE"])
    expect(statuses[50]).toBe("WAITLISTED")
    expect(statuses[51]).toBe("CONFIRMED")
  })
})

describe("computeFreePlaces", () => {
  it("is capacity minus confirmed per gender", () => {
    expect(computeFreePlaces({ FEMALE: 50, MALE: 50 }, { FEMALE: 20, MALE: 50 })).toEqual({
      FEMALE: 30,
      MALE: 0,
    })
  })

  it("goes negative when a removed room leaves the term overbooked", () => {
    const capacity = computeTermCapacity(rooms(1, 5, "FEMALE"))
    expect(computeFreePlaces(capacity, { FEMALE: 7, MALE: 0 }).FEMALE).toBe(-2)
  })
})
