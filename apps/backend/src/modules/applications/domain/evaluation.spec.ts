import { evaluateApplication, evaluateTerm } from "./evaluation"

describe("evaluateTerm", () => {
  it("confirms when a bed for the gender is free", () => {
    expect(evaluateTerm("FEMALE", { FEMALE: 1, MALE: 0 })).toBe("CONFIRMED")
  })

  it("waitlists when the gender is full, even if the other has room", () => {
    expect(evaluateTerm("FEMALE", { FEMALE: 0, MALE: 10 })).toBe("WAITLISTED")
  })

  it("waitlists in an overbooked term", () => {
    expect(evaluateTerm("MALE", { FEMALE: 0, MALE: -2 })).toBe("WAITLISTED")
  })
})

describe("evaluateApplication", () => {
  it("evaluates each selected term separately and freezes its price", () => {
    const result = evaluateApplication("MALE", [
      { termId: "week-1", priceCzk: 4500, freePlaces: { FEMALE: 3, MALE: 1 } },
      { termId: "week-2", priceCzk: 4900, freePlaces: { FEMALE: 3, MALE: 0 } },
    ])

    expect(result).toEqual([
      { termId: "week-1", status: "CONFIRMED", priceCzk: 4500 },
      { termId: "week-2", status: "WAITLISTED", priceCzk: 4900 },
    ])
  })
})
