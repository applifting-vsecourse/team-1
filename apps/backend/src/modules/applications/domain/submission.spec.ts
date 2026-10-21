import { evaluateSubmission, isValidBirthDate, SubmittedParticipant } from "./submission"

const rooms = [
  { capacity: 1, gender: "FEMALE" as const },
  { capacity: 2, gender: "MALE" as const },
]
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
  it("confirms while a bed of the participant's gender is free, then waitlists", () => {
    const result = evaluateSubmission([girl("t1"), girl("t1"), boy("t1")], {
      rooms,
      confirmedGenders: {},
    })
    expect(statuses(result)).toEqual([["CONFIRMED"], ["WAITLISTED"], ["CONFIRMED"]])
  })

  it("evaluates each term separately", () => {
    const result = evaluateSubmission([girl("t1", "t2"), girl("t1", "t2")], {
      rooms,
      confirmedGenders: { t1: ["FEMALE"] },
    })
    expect(statuses(result)).toEqual([
      ["WAITLISTED", "CONFIRMED"],
      ["WAITLISTED", "WAITLISTED"],
    ])
  })

  it("counts beds already taken by earlier applications", () => {
    const result = evaluateSubmission([boy("t1")], {
      rooms,
      confirmedGenders: { t1: ["MALE", "MALE"] },
    })
    expect(statuses(result)).toEqual([["WAITLISTED"]])
  })

  it("keeps the frozen price", () => {
    const [[term]] = evaluateSubmission([girl("t1")], { rooms, confirmedGenders: {} })
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
