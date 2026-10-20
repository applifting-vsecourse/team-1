import { describe, expect, it } from "vitest"

import type { PublicTerm } from "@/features/application-form/api/publicEvent"
import { priceOfSelection, totalPrice } from "@/features/application-form/lib/selection-price"

const terms: PublicTerm[] = [
  { id: "a", name: "1", startsOn: "2027-07-12", endsOn: "2027-07-18", priceCzk: 6900 },
  { id: "b", name: "2", startsOn: "2027-07-19", endsOn: "2027-07-25", priceCzk: 7200 },
  { id: "c", name: "3", startsOn: "2027-08-02", endsOn: "2027-08-08", priceCzk: 7400 },
]

describe("priceOfSelection", () => {
  it("sums the ticked terms only", () => {
    expect(priceOfSelection(terms, ["a", "b"])).toEqual({ termCount: 2, priceCzk: 14100 })
  })

  it("is zero without a selection and ignores unknown ids", () => {
    expect(priceOfSelection(terms, [])).toEqual({ termCount: 0, priceCzk: 0 })
    expect(priceOfSelection(terms, ["x"])).toEqual({ termCount: 0, priceCzk: 0 })
  })
})

describe("totalPrice", () => {
  it("adds up all participants", () => {
    expect(
      totalPrice([
        { termCount: 2, priceCzk: 14100 },
        { termCount: 1, priceCzk: 7200 },
      ]),
    ).toBe(21300)
  })
})
