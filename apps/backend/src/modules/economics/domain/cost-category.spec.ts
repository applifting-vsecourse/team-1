import { costCategoryName, defaultCostCategories } from "./cost-category"

describe("default cost categories", () => {
  it("come in the order of D-213, in both languages", () => {
    const categories = defaultCostCategories().map((category) => ({ ...category, name: null }))

    expect(categories.map((category) => category.position)).toEqual([0, 1, 2, 3, 4, 5])
    expect(categories.map((category) => costCategoryName(category, "cs"))).toEqual([
      "Prostory",
      "Doprava",
      "Strava",
      "Lidé",
      "Materiál a program",
      "Ostatní",
    ])
    expect(categories.map((category) => costCategoryName(category, "en"))).toEqual([
      "Venue",
      "Transport",
      "Food",
      "Staff",
      "Program & Entertainment",
      "Other",
    ])
  })

  it("keep a name of their own untranslated", () => {
    expect(costCategoryName({ defaultKey: "VENUE", name: "Chata" }, "en")).toBe("Chata")
    expect(costCategoryName({ defaultKey: null, name: "Pojištění" }, "en")).toBe("Pojištění")
  })
})
