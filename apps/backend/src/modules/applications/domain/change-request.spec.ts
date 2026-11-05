import { sameSelection, selectionPriceCzk } from "./change-request"

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
})
