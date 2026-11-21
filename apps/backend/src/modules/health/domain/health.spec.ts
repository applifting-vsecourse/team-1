import { decideHealth, healthWriteRoute } from "@/modules/health/domain/health"

describe("decideHealth", () => {
  it("saves a trimmed note with the explicit consent", () => {
    expect(decideHealth({ note: "  Astma · inhalátor u sebe.  ", consent: true })).toEqual({
      kind: "save",
      note: "Astma · inhalátor u sebe.",
    })
  })

  it("refuses a note without the consent", () => {
    expect(decideHealth({ note: "Astma", consent: false })).toEqual({ kind: "consent-required" })
  })

  it.each([
    ["empty", ""],
    ["whitespace only", "  \n "],
  ])("clears the record for an %s note, with or without the consent", (_name, note) => {
    expect(decideHealth({ note, consent: false })).toEqual({ kind: "clear" })
    expect(decideHealth({ note, consent: true })).toEqual({ kind: "clear" })
  })
})

describe("decideHealth — no restriction (US-150)", () => {
  it("confirms having no restriction with an empty note, without a consent", () => {
    expect(decideHealth({ note: " ", consent: false, noRestriction: true })).toEqual({
      kind: "none",
    })
  })

  it("refuses the confirmation together with a note", () => {
    expect(decideHealth({ note: "Astma", consent: true, noRestriction: true })).toEqual({
      kind: "invalid",
    })
  })
})

describe("healthWriteRoute", () => {
  it("lets the participant write before the first fill and requires a request after it", () => {
    expect(healthWriteRoute(false)).toBe("write")
    expect(healthWriteRoute(true)).toBe("request")
  })
})
