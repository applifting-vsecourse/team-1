import {
  CandidateSource,
  findCandidates,
  isAssignable,
  MAX_CANDIDATES,
} from "./application-candidates"

const row = (number: number, firstName: string, lastName: string): CandidateSource => ({
  id: `a${number}`,
  number,
  firstName,
  lastName,
  terms: [],
})

describe("findCandidates", () => {
  const rows = [row(12, "Hana", "Novotná"), row(3, "Jan", "Novák"), row(1200, "Eva", "Černá")]

  it("finds by words of the name without diacritics and case", () => {
    expect(findCandidates(rows, "novot hana").map((r) => r.number)).toEqual([12])
    expect(findCandidates(rows, "cerna").map((r) => r.number)).toEqual([1200])
    expect(findCandidates(rows, "nov").map((r) => r.number)).toEqual([3, 12])
  })

  it("reads a number as a variable symbol, then as the number of the application", () => {
    expect(findCandidates(rows, "12001").map((r) => r.number)).toEqual([12])
    expect(findCandidates(rows, "12000").map((r) => r.number)).toEqual([12])
    expect(findCandidates(rows, "3").map((r) => r.number)).toEqual([3])
  })

  it("returns nothing for an empty query and at most the limit", () => {
    expect(findCandidates(rows, "  ")).toEqual([])
    const many = Array.from({ length: 25 }, (_, i) => row(i + 1, "Eva", "Test"))
    expect(findCandidates(many, "test")).toHaveLength(MAX_CANDIDATES)
  })
})

describe("isAssignable", () => {
  it("accepts whole crowns only", () => {
    expect(isAssignable({ amountCents: 490000, currency: "CZK" })).toBe(true)
    expect(isAssignable({ amountCents: 100050, currency: "CZK" })).toBe(false)
    expect(isAssignable({ amountCents: 490000, currency: "EUR" })).toBe(false)
  })
})
