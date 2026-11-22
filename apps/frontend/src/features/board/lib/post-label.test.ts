import { describe, expect, it } from "vitest"

import { termsLabel } from "@/features/board/lib/post-label"

const t = ((key: string) => (key === "terms.both" ? "Oba termíny" : key)) as never
const term = (id: string, name: string | null) => ({
  id,
  name,
  startsOn: "2027-07-12",
  endsOn: "2027-07-18",
})

describe("termsLabel", () => {
  it("names a single term", () => {
    expect(termsLabel([term("a", "Letní týden")], 2, t)).toBe("Letní týden")
  })

  it("uses the dates of a term without a name", () => {
    expect(termsLabel([term("a", null)], 2, t)).toMatch(/12.*18/)
  })

  it("says both for the two terms of an event with exactly two", () => {
    expect(termsLabel([term("a", "A"), term("b", "B")], 2, t)).toBe("Oba termíny")
  })

  it("names two of the three terms of an event instead of saying both", () => {
    expect(termsLabel([term("a", "A"), term("c", "C")], 3, t)).toBe("A, C")
  })

  it("lists more terms", () => {
    expect(termsLabel([term("a", "A"), term("b", "B"), term("c", "C")], 3, t)).toBe("A, B, C")
  })
})
