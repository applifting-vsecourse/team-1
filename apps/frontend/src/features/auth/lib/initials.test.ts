import { describe, expect, it } from "vitest"

import { initials } from "@/features/auth/lib/initials"

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("Eva Malá")).toBe("EM")
  })

  it("ignores words after the second one", () => {
    expect(initials("Jan Amos Komenský")).toBe("JA")
  })

  it("uppercases and keeps Czech letters", () => {
    expect(initials("čeněk šťastný")).toBe("ČŠ")
  })

  it("uses a single letter for a one-word name", () => {
    expect(initials("Petra")).toBe("P")
  })

  it("skips surrounding and repeated whitespace", () => {
    expect(initials("  Eva \t  Malá ")).toBe("EM")
  })

  it("returns an empty string for an empty name", () => {
    expect(initials("")).toBe("")
    expect(initials("   ")).toBe("")
  })
})
