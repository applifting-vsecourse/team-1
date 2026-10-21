import { formatCzk } from "./format-czk"

// Intl separates thousands and the currency with non-breaking spaces.
const plain = (text: string): string => text.replace(/[\u00a0\u202f]/g, " ")

describe("formatCzk", () => {
  it("formats whole crowns the Czech way", () => {
    expect(plain(formatCzk(1500, "cs"))).toBe("1 500 Kč")
    expect(plain(formatCzk(0, "cs"))).toBe("0 Kč")
  })

  it("formats whole crowns the English way", () => {
    expect(plain(formatCzk(1500, "en"))).toBe("CZK 1,500")
    expect(plain(formatCzk(9400, "en"))).toBe("CZK 9,400")
  })
})
