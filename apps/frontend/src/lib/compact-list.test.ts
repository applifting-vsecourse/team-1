import { describe, expect, it } from "vitest"

import { compactList } from "@/lib/compact-list"

const range = (count: number): number[] => Array.from({ length: count }, (_, index) => index)

describe("compactList", () => {
  it("keeps a short list whole", () => {
    expect(compactList(range(3), 8)).toEqual({ visible: range(3), hiddenCount: 0 })
    expect(compactList(range(8), 8)).toEqual({ visible: range(8), hiddenCount: 0 })
  })

  it("never hides a single item", () => {
    expect(compactList(range(9), 8)).toEqual({ visible: range(9), hiddenCount: 0 })
  })

  it("shows the first items and counts the rest from two hidden on", () => {
    expect(compactList(range(10), 8)).toEqual({ visible: range(8), hiddenCount: 2 })
    expect(compactList(range(12), 8)).toEqual({ visible: range(8), hiddenCount: 4 })
    expect(compactList(range(100), 8)).toEqual({ visible: range(8), hiddenCount: 92 })
  })
})
