import { termDates, termDatesLine, termLine, termName, termTitle } from "@/lib/term-label"

const dates = { startsOn: "2027-07-12", endsOn: "2027-07-18" }

describe("term label", () => {
  it("has a name when it is set", () => {
    expect(termName({ name: "První turnus" })).toBe("První turnus")
    expect(termTitle({ name: "První turnus", ...dates })).toBe("První turnus")
  })

  it("is just the dates without a name", () => {
    expect(termName({ name: null })).toBeNull()
    expect(termTitle({ name: null, ...dates })).toBe(termDates(dates))
  })

  it("takes a name of spaces for no name", () => {
    expect(termName({ name: "   " })).toBeNull()
    expect(termTitle({ name: "  ", ...dates })).toBe(termDates(dates))
  })

  it("puts the name before the dates in a line, and has only the dates without one", () => {
    expect(termLine({ name: "První turnus", ...dates })).toBe(`První turnus · ${termDates(dates)}`)
    expect(termLine({ name: null, ...dates })).toBe(termDates(dates))
    expect(termLine({ name: " ", ...dates })).toBe(termDates(dates))
  })

  it("puts the dates before the name in a dates line", () => {
    expect(termDatesLine({ name: "První turnus", ...dates })).toBe(
      `${termDates(dates)} · První turnus`,
    )
    expect(termDatesLine({ name: null, ...dates })).toBe(termDates(dates))
  })
})
