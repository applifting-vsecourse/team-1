import {
  CandidateSource,
  findCandidates,
  isAssignable,
  MAX_CANDIDATES,
  withAfterPayment,
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

describe("withAfterPayment", () => {
  const source = (owedCzk: number, paidCzk: number): CandidateSource => ({
    ...row(1, "Eva", "Test"),
    terms: [
      {
        termId: "t1",
        termNumber: 1,
        name: null,
        startsOn: "2027-07-01",
        endsOn: "2027-07-08",
        status: "CONFIRMED",
        owedCzk,
        paidCzk,
      },
    ],
  })
  const after = (owedCzk: number, paidCzk: number, amount: number | null) =>
    withAfterPayment([source(owedCzk, paidCzk)], amount)[0]!.terms[0]!.afterPayment

  it("less than the debt: what is left", () => {
    expect(after(4900, 0, 2000)).toEqual({ fromCzk: 0, toCzk: 2000, restCzk: 2900, overCzk: 0 })
  })
  it("exactly the debt: nothing left", () => {
    expect(after(4900, 100, 4900)).toEqual({ fromCzk: 100, toCzk: 5000, restCzk: 0, overCzk: 0 })
  })
  it("more than the debt: an overpayment", () => {
    expect(after(4900, 0, 5500)).toMatchObject({ restCzk: 0, overCzk: 600 })
  })
  it("without a payment: null", () => {
    expect(after(4900, 0, null)).toBeNull()
  })
})
