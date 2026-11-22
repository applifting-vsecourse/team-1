import { describe, expect, it } from "vitest"

import { afterAssignment, preselectedTermId } from "@/features/event-overview/lib/assignment"

describe("afterAssignment", () => {
  it("less than the debt: what is left", () => {
    expect(afterAssignment({ paidCzk: 0, owedCzk: 4900, amountCzk: 2000 })).toEqual({
      fromCzk: 0,
      toCzk: 2000,
      restCzk: 2900,
      overCzk: 0,
    })
  })
  it("exactly the debt: nothing left", () => {
    expect(afterAssignment({ paidCzk: 100, owedCzk: 4900, amountCzk: 4900 })).toEqual({
      fromCzk: 100,
      toCzk: 5000,
      restCzk: 0,
      overCzk: 0,
    })
  })
  it("more than the debt: an overpayment", () => {
    expect(afterAssignment({ paidCzk: 0, owedCzk: 4900, amountCzk: 5500 })).toMatchObject({
      restCzk: 0,
      overCzk: 600,
    })
  })
})

describe("preselectedTermId", () => {
  const terms = [
    { termId: "t1", termNumber: 1 },
    { termId: "t2", termNumber: 2 },
  ]
  it("takes the only term, or the one the variable symbol points to", () => {
    expect(preselectedTermId(terms.slice(0, 1), null)).toBe("t1")
    expect(preselectedTermId(terms, "12002")).toBe("t2")
  })
  it("chooses nothing otherwise", () => {
    expect(preselectedTermId(terms, null)).toBeNull()
    expect(preselectedTermId(terms, "12000")).toBeNull()
    expect(preselectedTermId(terms, "12009")).toBeNull()
    expect(preselectedTermId(terms, "abc")).toBeNull()
  })
})
