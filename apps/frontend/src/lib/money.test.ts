import { describe, expect, it } from "vitest"

import { formatDate } from "@/lib/date"
import { formatCzk, formatTermPrice } from "@/lib/money"

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

describe("formatTermPrice", () => {
  it("shows a free term as Zdarma / Free", () => {
    expect(formatTermPrice(0, "cs")).toBe("Zdarma")
    expect(formatTermPrice(0, "en")).toBe("Free")
  })

  it("formats a paid term like formatCzk", () => {
    expect(normalise(formatTermPrice(6900, "cs"))).toBe("6 900 Kč")
  })
})

describe("formatDate", () => {
  it("follows the UI language", () => {
    const opening = new Date(2027, 1, 7)
    expect(normalise(formatDate(opening, "cs"))).toBe("7. 2. 2027")
    expect(formatDate(opening, "en")).toBe("7 Feb 2027")
  })
})
