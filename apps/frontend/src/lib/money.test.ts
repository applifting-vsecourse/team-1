import { describe, expect, it } from "vitest"

import { formatDate } from "@/lib/date"
import { formatCzk } from "@/lib/money"

// Intl separates thousands and the currency with (narrow) no-break spaces;
// normalise them so the assertions read like the UI does.
const normalise = (value: string) => value.replace(/\s/g, " ")

describe("formatCzk", () => {
  it("formats whole crowns the Czech way", () => {
    expect(normalise(formatCzk(1500, "cs"))).toBe("1 500 Kč")
    expect(normalise(formatCzk(0, "cs"))).toBe("0 Kč")
  })

  it("formats whole crowns the English way", () => {
    expect(normalise(formatCzk(1500, "en"))).toBe("CZK 1,500")
  })
})

describe("formatDate", () => {
  it("follows the UI language", () => {
    const opening = new Date(2027, 1, 7)
    expect(normalise(formatDate(opening, "cs"))).toBe("7. 2. 2027")
    expect(formatDate(opening, "en")).toBe("7 Feb 2027")
  })
})
