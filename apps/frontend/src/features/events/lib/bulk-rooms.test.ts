import { describe, expect, it } from "vitest"

import { formatNumbers } from "@/features/events/lib/bulk-rooms"

describe("formatNumbers", () => {
  it("joins consecutive numbers into ranges", () => {
    expect(formatNumbers(["109", "110", "111", "120", "122", "123"])).toBe("109–111, 120, 122–123")
    expect(formatNumbers(["7"])).toBe("7")
    expect(formatNumbers([])).toBe("")
  })

  it("cuts a long list", () => {
    const names = Array.from({ length: 30 }, (_, index) => String(index * 2))
    expect(formatNumbers(names, 3)).toBe("0, 2, 4, …")
  })
})
