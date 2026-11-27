import { normalizePronouns } from "@/shared/domain/pronouns"

describe("normalizePronouns", () => {
  it("trims the value and preserves spacing inside the pronouns", () => {
    expect(normalizePronouns("  ona / její  ")).toBe("ona / její")
  })

  it.each(["", " \t\n", null, undefined])("stores %p as an absent value", (value) => {
    expect(normalizePronouns(value)).toBeNull()
  })
})
