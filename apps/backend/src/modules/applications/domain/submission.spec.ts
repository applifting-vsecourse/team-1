import { evaluateSubmission, isValidBirthDate, SubmittedParticipant } from "./submission"

const rooms = [
  { capacity: 1, gender: "FEMALE" as const },
  { capacity: 2, gender: "MALE" as const },
]
const sharedRooms = (capacity: number) => ({
  t1: [{ capacity, gender: null }],
  t2: [{ capacity, gender: null }],
})
const girl = (...termIds: string[]): SubmittedParticipant => ({
  gender: "FEMALE",
  terms: termIds.map((termId) => ({ termId, priceCzk: 1000 })),
})
const boy = (...termIds: string[]): SubmittedParticipant => ({
  gender: "MALE",
  terms: termIds.map((termId) => ({ termId, priceCzk: 1000 })),
})
const statuses = (result: ReturnType<typeof evaluateSubmission>): string[][] =>
  result.map((terms) => terms.map((term) => term.status))

describe("evaluateSubmission", () => {
  it("leaves every term to the organizer in the manual mode and takes no bed (US-102)", () => {
    const result = evaluateSubmission(
      [girl("t1", "t2"), girl("t1", "t2")],
      { roomsByTerm: sharedRooms(1), confirmedGenders: {} },
      "MANUAL",
    )
    expect(statuses(result)).toEqual([
      ["TO_EVALUATE", "TO_EVALUATE"],
      ["TO_EVALUATE", "TO_EVALUATE"],
    ])
    expect(result[0][0]).toMatchObject({ priceCzk: 1000 })
  })

  it("uses one shared pool for all genders and evaluates terms independently", () => {
    const result = evaluateSubmission(
      [girl("t1", "t2"), boy("t1", "t2"), girl("t1", "t2")],
      {
        roomsByTerm: sharedRooms(2),
        confirmedGenders: { t1: ["MALE"] },
      },
      "AUTOMATIC",
    )
    expect(statuses(result)).toEqual([
      ["CONFIRMED", "CONFIRMED"],
      ["WAITLISTED", "CONFIRMED"],
      ["WAITLISTED", "WAITLISTED"],
    ])
  })

  it("keeps existing confirmations when shared capacity is reduced", () => {
    expect(
      statuses(
        evaluateSubmission(
          [girl("t1"), boy("t1")],
          {
            roomsByTerm: sharedRooms(1),
            confirmedGenders: { t1: ["FEMALE", "MALE"] },
          },
          "AUTOMATIC",
        ),
      ),
    ).toEqual([["WAITLISTED"], ["WAITLISTED"]])
  })

  it("confirms while a bed of the participant's gender is free, then waitlists", () => {
    const result = evaluateSubmission(
      [girl("t1"), girl("t1"), boy("t1")],
      {
        roomsByTerm: { t1: rooms, t2: rooms },
        confirmedGenders: {},
      },
      "AUTOMATIC",
    )
    expect(statuses(result)).toEqual([["CONFIRMED"], ["WAITLISTED"], ["CONFIRMED"]])
  })

  it("evaluates each term separately", () => {
    const result = evaluateSubmission(
      [girl("t1", "t2"), girl("t1", "t2")],
      {
        roomsByTerm: { t1: rooms, t2: rooms },
        confirmedGenders: { t1: ["FEMALE"] },
      },
      "AUTOMATIC",
    )
    expect(statuses(result)).toEqual([
      ["WAITLISTED", "CONFIRMED"],
      ["WAITLISTED", "WAITLISTED"],
    ])
  })

  it("counts beds already taken by earlier applications", () => {
    const result = evaluateSubmission(
      [boy("t1")],
      {
        roomsByTerm: { t1: rooms, t2: rooms },
        confirmedGenders: { t1: ["MALE", "MALE"] },
      },
      "AUTOMATIC",
    )
    expect(statuses(result)).toEqual([["WAITLISTED"]])
  })

  it("takes the beds of each term from that term's own rooms", () => {
    const result = evaluateSubmission(
      [girl("t1", "t2"), boy("t1", "t2")],
      {
        roomsByTerm: {
          t1: [{ capacity: 1, gender: "FEMALE" }],
          t2: [{ capacity: 1, gender: "MALE" }],
        },
        confirmedGenders: {},
      },
      "AUTOMATIC",
    )
    expect(statuses(result)).toEqual([
      ["CONFIRMED", "WAITLISTED"],
      ["WAITLISTED", "CONFIRMED"],
    ])
  })

  it("waitlists a term without rooms", () => {
    const result = evaluateSubmission(
      [girl("t1")],
      { roomsByTerm: {}, confirmedGenders: {} },
      "AUTOMATIC",
    )
    expect(statuses(result)).toEqual([["WAITLISTED"]])
  })

  it("keeps the frozen price", () => {
    const [[term]] = evaluateSubmission(
      [girl("t1")],
      {
        roomsByTerm: { t1: rooms },
        confirmedGenders: {},
      },
      "AUTOMATIC",
    )
    expect(term).toEqual({ termId: "t1", status: "CONFIRMED", priceCzk: 1000 })
  })
})

describe("isValidBirthDate", () => {
  const today = new Date("2026-10-21T10:00:00Z")
  it.each(["2014-05-18", "1900-01-01", "2026-10-21"])("accepts %s", (iso) => {
    expect(isValidBirthDate(iso, today)).toBe(true)
  })
  it.each(["2014-02-30", "1899-12-31", "2026-10-22", "18. 5. 2014", ""])("rejects %s", (iso) => {
    expect(isValidBirthDate(iso, today)).toBe(false)
  })
})
