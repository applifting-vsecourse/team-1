import { describe, expect, it } from "vitest"

import { dayOf, fromDateTimeValue, toDateTimeValue } from "@/features/transport/lib/departure"

describe("date and time values", () => {
  it("round-trips an instant through the field value", () => {
    const iso = "2027-07-12T06:00:00.000Z"
    expect(fromDateTimeValue(toDateTimeValue(iso))).toBe(iso)
  })

  it("reads anything but a full value as no time", () => {
    expect(fromDateTimeValue("")).toBeNull()
    expect(fromDateTimeValue("soon")).toBeNull()
    expect(fromDateTimeValue("2027-07-12")).toBeNull()
    expect(fromDateTimeValue("2027-02-31T08:00")).toBeNull()
    expect(fromDateTimeValue("2027-07-12T25:00")).toBeNull()
  })

  it("takes the day of a value", () => {
    expect(dayOf("2027-07-12T08:00")).toBe("2027-07-12")
  })
})
