import {
  CatalogEvent,
  organizationsOf,
  summarizeTerms,
} from "@/modules/applications/domain/public-catalog"

describe("summarizeTerms", () => {
  it("counts the terms and takes the lowest price", () => {
    expect(summarizeTerms([{ priceCzk: 4900 }, { priceCzk: 4500 }])).toEqual({
      termCount: 2,
      fromPriceCzk: 4500,
    })
  })

  it("has no price for an event without a term", () => {
    expect(summarizeTerms([])).toEqual({ termCount: 0, fromPriceCzk: null })
  })
})

describe("organizationsOf", () => {
  const event = (organizationId: string, organizationName: string): CatalogEvent => ({
    publicToken: `${organizationId}-${organizationName}`,
    name: "Akce",
    organizationId,
    organizationName,
    location: null,
    terms: [],
    termCount: 0,
    fromPriceCzk: null,
    isOpenForApplications: false,
  })

  it("lists each organization once, by name", () => {
    expect(organizationsOf([event("b", "Zima"), event("a", "Alpine"), event("b", "Zima")])).toEqual(
      [
        { id: "a", name: "Alpine" },
        { id: "b", name: "Zima" },
      ],
    )
  })
})
