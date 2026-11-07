import { decideHealth } from "@/modules/health/domain/health"

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
