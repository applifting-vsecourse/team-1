import { isValidTermPeriod, sortTerms } from "./event-term"

describe("isValidTermPeriod", () => {
  it("accepts an end after the start and a one-day term", () => {
    expect(isValidTermPeriod("2027-08-02", "2027-08-08")).toBe(true)
    expect(isValidTermPeriod("2027-08-02", "2027-08-02")).toBe(true)
  })

  it("rejects an end before the start", () => {
    expect(isValidTermPeriod("2027-08-09", "2027-08-08")).toBe(false)
  })

  it("rejects malformed and impossible dates", () => {
    expect(isValidTermPeriod("9. 8. 2027", "2027-08-10")).toBe(false)
    expect(isValidTermPeriod("2027-02-30", "2027-03-10")).toBe(false)
  })
})

describe("sortTerms", () => {
  it("orders by start date, then end date, then name", () => {
    const terms = [
      { name: "C", startsOn: "2027-08-02", endsOn: "2027-08-08" },
      { name: "B", startsOn: "2027-07-12", endsOn: "2027-07-18" },
      { name: "A", startsOn: "2027-07-12", endsOn: "2027-07-14" },
    ]
    expect(sortTerms(terms).map((term) => term.name)).toEqual(["A", "B", "C"])
    expect(terms[0].name).toBe("C")
  })
})
