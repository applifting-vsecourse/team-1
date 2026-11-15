import { isCancellationStartAllowed, isValidCancellationStart } from "./cancellation-start"

describe("isValidCancellationStart", () => {
  it.each(["2027-07-01", "2028-02-29", "2000-02-29"])("accepts %s", (value) => {
    expect(isValidCancellationStart(value)).toBe(true)
  })

  it.each(["2027-02-29", "2027-13-01", "2027-04-31", "2027-7-1", "2027-07-01T00:00:00Z"])(
    "rejects %s",
    (value) => expect(isValidCancellationStart(value)).toBe(false),
  )
})

describe("isCancellationStartAllowed", () => {
  const today = "2027-07-01"

  it.each([
    ["today", "2027-07-01"],
    ["a future day", "2027-07-02"],
    ["clearing the date", null],
  ])("allows %s as a first setting", (_, next) =>
    expect(isCancellationStartAllowed(next, null, today)).toBe(true),
  )

  it.each(["2027-06-30", "2020-01-01"])("rejects a new day in the past (%s)", (next) => {
    expect(isCancellationStartAllowed(next, null, today)).toBe(false)
    expect(isCancellationStartAllowed(next, "2027-09-01", today)).toBe(false)
  })

  it("rejects changing a lapsed day to another day in the past", () => {
    expect(isCancellationStartAllowed("2027-06-29", "2027-06-01", today)).toBe(false)
  })

  it("keeps an unchanged day that has already passed", () => {
    expect(isCancellationStartAllowed("2027-06-01", "2027-06-01", today)).toBe(true)
  })

  it("allows moving a lapsed day to today or later, and clearing it", () => {
    expect(isCancellationStartAllowed("2027-07-01", "2027-06-01", today)).toBe(true)
    expect(isCancellationStartAllowed("2028-01-01", "2027-06-01", today)).toBe(true)
    expect(isCancellationStartAllowed(null, "2027-06-01", today)).toBe(true)
  })
})
