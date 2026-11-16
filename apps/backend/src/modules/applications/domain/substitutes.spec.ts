import {
  eligibleSubstitutes,
  proposedSubstitutes,
  substituteForFreedBed,
} from "@/modules/applications/domain/substitutes"
import { WaitlistCandidate } from "@/modules/applications/domain/waitlist"

const candidate = (
  applicationId: string,
  gender: "FEMALE" | "MALE",
  minute: number,
  overrides: Partial<WaitlistCandidate> = {},
): WaitlistCandidate => ({
  applicationId,
  termId: "t1",
  roomMode: "GENDERED",
  gender,
  status: "WAITLISTED",
  submittedAt: new Date(Date.UTC(2027, 2, 10, 9, minute)),
  number: minute + 1,
  ...overrides,
})
const ids = (list: { applicationId: string }[]) => list.map((row) => row.applicationId)

describe("eligibleSubstitutes", () => {
  const rooms = [
    { capacity: 1, extraBeds: 0, gender: "FEMALE" as const },
    { capacity: 1, extraBeds: 0, gender: "MALE" as const },
  ]

  it("offers only the gender that has a free bed, in order of receipt", () => {
    const result = eligibleSubstitutes({ rooms, confirmedGenders: ["FEMALE"] }, [
      candidate("jana", "FEMALE", 0),
      candidate("petr", "MALE", 2),
      candidate("adam", "MALE", 1),
    ])
    expect(ids(result)).toEqual(["adam", "petr"])
    expect(result.map((row) => row.position)).toEqual([1, 2])
  })

  it("offers nobody when no bed is free", () => {
    expect(
      eligibleSubstitutes({ rooms, confirmedGenders: ["FEMALE", "MALE"] }, [
        candidate("jana", "FEMALE", 0),
        candidate("petr", "MALE", 1),
      ]),
    ).toEqual([])
  })

  it("keeps the waitlist position among all waiting of the group", () => {
    const result = eligibleSubstitutes({ rooms, confirmedGenders: [] }, [
      candidate("a", "MALE", 0),
      candidate("b", "FEMALE", 1),
      candidate("c", "MALE", 2),
    ])
    expect(result.find((row) => row.applicationId === "c")?.position).toBe(2)
    expect(ids(result)).toEqual(["a", "b", "c"])
  })

  it("has one common queue in shared rooms, whatever the gender", () => {
    const shared = [{ capacity: 2, extraBeds: 0, gender: null }]
    const result = eligibleSubstitutes({ rooms: shared, confirmedGenders: ["MALE"] }, [
      candidate("jana", "FEMALE", 1, { roomMode: "SHARED" }),
      candidate("petr", "MALE", 0, { roomMode: "SHARED" }),
    ])
    expect(ids(result)).toEqual(["petr", "jana"])
    expect(result.map((row) => [row.position, row.group])).toEqual([
      [1, "SHARED"],
      [2, "SHARED"],
    ])
  })

  it("ignores applications that are not waitlisted and breaks ties by number", () => {
    const result = eligibleSubstitutes({ rooms, confirmedGenders: [] }, [
      candidate("late", "MALE", 0, { number: 5 }),
      candidate("early", "MALE", 0, { number: 4 }),
      candidate("done", "MALE", 0, { status: "CONFIRMED" }),
    ])
    expect(ids(result)).toEqual(["early", "late"])
  })
})

describe("proposedSubstitutes (US-31)", () => {
  const rooms = [
    { capacity: 2, extraBeds: 0, gender: "FEMALE" as const },
    { capacity: 2, extraBeds: 0, gender: "MALE" as const },
  ]

  it("proposes the first of each gender that has a free bed", () => {
    const result = proposedSubstitutes({ rooms, confirmedGenders: ["MALE", "MALE"] }, [
      candidate("petr", "MALE", 0),
      candidate("jana", "FEMALE", 2),
      candidate("eva", "FEMALE", 1),
    ])
    expect(ids(result)).toEqual(["eva"])
    expect(result[0]).toMatchObject({ position: 1, group: "FEMALE" })
  })

  it("proposes one per gender when both have a free bed, in order of receipt", () => {
    const result = proposedSubstitutes({ rooms, confirmedGenders: [] }, [
      candidate("a", "MALE", 0),
      candidate("b", "MALE", 1),
      candidate("c", "FEMALE", 2),
    ])
    expect(ids(result)).toEqual(["a", "c"])
  })

  it("proposes one for the common queue of shared rooms", () => {
    const shared = [{ capacity: 3, extraBeds: 0, gender: null }]
    const result = proposedSubstitutes({ rooms: shared, confirmedGenders: [] }, [
      candidate("jana", "FEMALE", 1, { roomMode: "SHARED" }),
      candidate("petr", "MALE", 0, { roomMode: "SHARED" }),
    ])
    expect(ids(result)).toEqual(["petr"])
  })

  it("proposes nobody without a free bed", () => {
    expect(
      proposedSubstitutes({ rooms, confirmedGenders: ["MALE", "MALE"] }, [
        candidate("petr", "MALE", 0),
      ]),
    ).toEqual([])
  })
})

describe("substituteForFreedBed (US-31)", () => {
  const rooms = [
    { capacity: 1, extraBeds: 0, gender: "FEMALE" as const },
    { capacity: 1, extraBeds: 0, gender: "MALE" as const },
  ]
  const waiting = [
    candidate("jana", "FEMALE", 0),
    candidate("petr", "MALE", 1),
    candidate("adam", "MALE", 2),
  ]

  it("takes the first of the group of the freed bed, not of another group with a free bed", () => {
    const term = { rooms, confirmedGenders: [] }
    expect(substituteForFreedBed(term, waiting, "MALE")?.applicationId).toBe("petr")
    expect(substituteForFreedBed(term, waiting, "FEMALE")?.applicationId).toBe("jana")
  })

  it("takes nobody when the group has no free bed or no substitute", () => {
    expect(
      substituteForFreedBed({ rooms, confirmedGenders: ["MALE"] }, waiting, "MALE"),
    ).toBeUndefined()
    expect(
      substituteForFreedBed(
        { rooms, confirmedGenders: [] },
        [candidate("jana", "FEMALE", 0)],
        "MALE",
      ),
    ).toBeUndefined()
  })

  it("skips the application that must not take the bed", () => {
    expect(
      substituteForFreedBed({ rooms, confirmedGenders: [] }, waiting, "MALE", "petr")
        ?.applicationId,
    ).toBe("adam")
  })

  it("has one common queue in shared rooms", () => {
    const shared = [{ capacity: 1, extraBeds: 0, gender: null }]
    const result = substituteForFreedBed(
      { rooms: shared, confirmedGenders: [] },
      [candidate("jana", "FEMALE", 0, { roomMode: "SHARED" })],
      "SHARED",
    )
    expect(result?.applicationId).toBe("jana")
  })
})
