import { describe, expect, it } from "vitest"

import { parseBirthDate } from "@/features/application-form/lib/birth-date"

describe("parseBirthDate", () => {
  it("reads the Czech format from the design", () => {
    expect(parseBirthDate("18. 5. 2014")).toBe("2014-05-18")
    expect(parseBirthDate("18.5.2014")).toBe("2014-05-18")
    expect(parseBirthDate(" 01. 12. 2010 ")).toBe("2010-12-01")
  })

  it("accepts slashes, dashes and a pasted ISO date", () => {
    expect(parseBirthDate("18/5/2014")).toBe("2014-05-18")
    expect(parseBirthDate("18-05-2014")).toBe("2014-05-18")
    expect(parseBirthDate("2014-05-18")).toBe("2014-05-18")
  })

  it("rejects days that don't exist", () => {
    expect(parseBirthDate("31. 2. 2014")).toBeNull()
    expect(parseBirthDate("18. 13. 2014")).toBeNull()
    expect(parseBirthDate("0. 5. 2014")).toBeNull()
  })

  it("rejects anything else", () => {
    expect(parseBirthDate("")).toBeNull()
    expect(parseBirthDate("18. 5.")).toBeNull()
    expect(parseBirthDate("18. 5. 14")).toBeNull()
    expect(parseBirthDate("květen 2014")).toBeNull()
  })
})
