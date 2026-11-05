import { isValidCancellationStart } from "./cancellation-start"

describe("isValidCancellationStart", () => {
  it.each(["2027-07-01", "2028-02-29", "2000-02-29"])("accepts %s", (value) => {
    expect(isValidCancellationStart(value)).toBe(true)
  })

  it.each(["2027-02-29", "2027-13-01", "2027-04-31", "2027-7-1", "2027-07-01T00:00:00Z"])(
    "rejects %s",
    (value) => expect(isValidCancellationStart(value)).toBe(false),
  )
})
