import { describe, expect, it } from "vitest"

import { applicationsSearchSchema } from "@/features/event-overview/lib/applications-search"

describe("applicationsSearchSchema page (#734)", () => {
  it("reads a 1-based page from the URL", () => {
    expect(applicationsSearchSchema.parse({ page: "3" }).page).toBe(3)
    expect(applicationsSearchSchema.parse({ page: 2 }).page).toBe(2)
  })

  it("treats a missing page as absent, meaning the first", () => {
    expect(applicationsSearchSchema.parse({}).page).toBeUndefined()
  })

  it.each(["0", "-1", "abc", "1.5", "99999"])("ignores the invalid page %s", (page) => {
    expect(applicationsSearchSchema.parse({ page }).page).toBeUndefined()
  })
})
