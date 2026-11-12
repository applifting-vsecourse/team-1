import { Gender } from "@/shared/domain/gender"
import {
  computeAvailablePlaces,
  computeFreePlaces,
  computeRoomBeds,
  computeSharedFreePlaces,
  computeTermCapacity,
  computeTotalBeds,
  countByGender,
  RoomCapacity,
} from "./capacity"
import { evaluateQueue } from "./evaluation"

const rooms = (count: number, capacity: number, gender: Gender): RoomCapacity[] =>
  Array.from({ length: count }, () => ({ capacity, extraBeds: 0, gender }))

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

describe("computeSharedFreePlaces", () => {
  it("counts a shared bed once and does not clamp an overbooked term", () => {
    const shared: RoomCapacity[] = [
      { capacity: 6, extraBeds: 0, gender: null },
      { capacity: 4, extraBeds: 0, gender: null },
    ]
    expect(computeSharedFreePlaces(shared, 3)).toBe(7)
    expect(computeSharedFreePlaces(shared, 12)).toBe(-2)
  })
})

describe("extra beds (přistýlky)", () => {
  const withExtra = (extraBeds: number, capacity = 4, gender: Gender | null = "FEMALE") => ({
    capacity,
    extraBeds,
    gender,
  })

  it("counts every extra bed as one more bed of the room", () => {
    expect(computeRoomBeds(withExtra(2))).toBe(6)
    expect(computeRoomBeds(withExtra(0))).toBe(4)
  })

  it("adds them to the group of the room's gender", () => {
    expect(computeTermCapacity([withExtra(2), withExtra(1, 5, "MALE")])).toEqual({
      FEMALE: 6,
      MALE: 6,
    })
  })

  it("adds them to the common pool of shared rooms once", () => {
    const shared = [withExtra(2, 4, null), withExtra(1, 3, null)]
    expect(computeTotalBeds(shared)).toBe(10)
    expect(computeAvailablePlaces(shared, ["FEMALE", "MALE"])).toEqual({ FEMALE: 8, MALE: 8 })
    expect(computeSharedFreePlaces(shared, 4)).toBe(6)
  })

  it("moves the free beds of one gender only and may leave them negative", () => {
    const gendered = [withExtra(1), withExtra(0, 2, "MALE")]
    expect(computeAvailablePlaces(gendered, ["FEMALE", "MALE", "MALE", "MALE"])).toEqual({
      FEMALE: 4,
      MALE: -1,
    })
  })
})
