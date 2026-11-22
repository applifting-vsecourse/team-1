import { describe, expect, it } from "vitest"

import { preselectedTermId } from "@/features/event-overview/lib/assignment"

describe("preselectedTermId", () => {
  const terms = [
    { termId: "t1", termNumber: 1 },
    { termId: "t2", termNumber: 2 },
  ]
  it("takes the only term, or the one the variable symbol points to", () => {
    expect(preselectedTermId(terms.slice(0, 1), null)).toBe("t1")
    expect(preselectedTermId(terms, "12002")).toBe("t2")
  })
  it("chooses nothing otherwise", () => {
    expect(preselectedTermId(terms, null)).toBeNull()
    expect(preselectedTermId(terms, "12000")).toBeNull()
    expect(preselectedTermId(terms, "12009")).toBeNull()
    expect(preselectedTermId(terms, "abc")).toBeNull()
  })
})
