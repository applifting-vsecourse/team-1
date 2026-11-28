import { describe, expect, it } from "vitest"

import { preselectedTermId } from "@/features/event-overview/lib/assignment"

describe("preselectedTermId", () => {
  const terms = [
    { termId: "t1", termNumber: 1 },
    { termId: "t2", termNumber: 2 },
  ]
  const application = { number: 12, terms }
  it("takes the only term, or the one the variable symbol of this application points to", () => {
    expect(preselectedTermId({ number: 34, terms: terms.slice(0, 1) }, "12002")).toBe("t1")
    expect(preselectedTermId(application, "12002")).toBe("t2")
  })
  it("chooses nothing otherwise", () => {
    expect(preselectedTermId(application, null)).toBeNull()
    expect(preselectedTermId(application, "12000")).toBeNull()
    expect(preselectedTermId(application, "12009")).toBeNull()
    expect(preselectedTermId(application, "abc")).toBeNull()
  })
  it("ignores the term of a symbol that belongs to another application", () => {
    expect(preselectedTermId({ number: 34, terms }, "12002")).toBeNull()
    expect(preselectedTermId({ number: 2, terms }, "12002")).toBeNull()
  })
})
