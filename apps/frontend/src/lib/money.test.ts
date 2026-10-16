import { describe, expect, it } from "vitest"

import { formatCzk } from "@/lib/money"

// Intl separates thousands and the currency with (narrow) no-break spaces;
// normalise them so the assertions read like the UI does.
const normalise = (value: string) => value.replace(/\s/g, " ")

describe("formatCzk", () => {
  it("formats whole crowns with Czech separators", () => {
    expect(normalise(formatCzk(1500))).toBe("1 500 Kč")
  })

  it("formats zero", () => {
    expect(normalise(formatCzk(0))).toBe("0 Kč")
  })
})
