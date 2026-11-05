import { sameSelection, selectionPriceCzk, termChangeApprovalPolicy } from "./change-request"

describe("change request selection", () => {
  it("compares selected terms regardless of order", () => {
    expect(sameSelection(["first", "second"], ["second", "first"])).toBe(true)
    expect(sameSelection(["first"], ["second"])).toBe(false)
  })

  it("sums the prices supplied for the selected terms", () => {
    const terms = [
      { id: "first", priceCzk: 1200 },
      { id: "second", priceCzk: 2300 },
    ]
    expect(selectionPriceCzk(["second", "first"], terms)).toBe(3500)
    expect(selectionPriceCzk([], terms)).toBe(0)
  })

  it("keeps a request pending if the applicant's bed group is full", () => {
    expect(
      termChangeApprovalPolicy("AUTOMATIC", true, "MALE", [{ freePlaces: { FEMALE: 2, MALE: 0 } }]),
    ).toEqual({ evaluationMode: "AUTOMATIC", hasCapacity: false })
  })

  it("confirms an approved request even when the event uses manual evaluation", () => {
    expect(
      termChangeApprovalPolicy("MANUAL", true, "MALE", [{ freePlaces: { FEMALE: 0, MALE: 1 } }]),
    ).toEqual({ evaluationMode: "AUTOMATIC", hasCapacity: true })
    expect(
      termChangeApprovalPolicy("MANUAL", false, "MALE", [{ freePlaces: { FEMALE: 0, MALE: 0 } }]),
    ).toEqual({ evaluationMode: "MANUAL", hasCapacity: true })
  })
})
