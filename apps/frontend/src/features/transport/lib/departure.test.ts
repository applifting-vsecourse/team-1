import { describe, expect, it } from "vitest"

import { fromDateTimeLocal, toDateTimeLocal } from "@/features/transport/lib/departure"

describe("datetime-local conversion", () => {
  it("round-trips an instant through the field value", () => {
    const iso = "2027-07-12T06:00:00.000Z"
    expect(fromDateTimeLocal(toDateTimeLocal(iso))).toBe(iso)
  })

  it("reads an empty or invalid value as no time", () => {
    expect(fromDateTimeLocal("")).toBeNull()
    expect(fromDateTimeLocal("soon")).toBeNull()
  })
})
