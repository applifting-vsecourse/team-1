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
    expect(termsLabel([term("a", "Letní týden")], t)).toBe("Letní týden")
  })

  it("uses the dates of a term without a name", () => {
    expect(termsLabel([term("a", null)], t)).toMatch(/12.*18/)
  })

  it("says both for two terms", () => {
    expect(termsLabel([term("a", "A"), term("b", "B")], t)).toBe("Oba termíny")
  })

  it("lists more terms", () => {
    expect(termsLabel([term("a", "A"), term("b", "B"), term("c", "C")], t)).toBe("A, B, C")
  })
})
