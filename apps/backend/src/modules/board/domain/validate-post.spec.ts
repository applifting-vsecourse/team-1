import { areTermsValid, normalizePostInput } from "./validate-post"

describe("normalizePostInput", () => {
  const raw = { title: "  Odjezd ", body: "Sraz v 9:00\n\nu nádraží ", termIds: ["t1", "t1", "t2"] }

  it("trims the texts, keeps line breaks and drops duplicate terms", () => {
    expect(normalizePostInput(raw)).toEqual({
      title: "Odjezd",
      body: "Sraz v 9:00\n\nu nádraží",
      termIds: ["t1", "t2"],
    })
  })

  it.each([
    ["an empty title", { ...raw, title: "   " }],
    ["a title over 120", { ...raw, title: "x".repeat(121) }],
    ["an empty body", { ...raw, body: "" }],
    ["a body over 5000", { ...raw, body: "x".repeat(5001) }],
    ["a missing title", { ...raw, title: undefined }],
    ["terms that are not a list", { ...raw, termIds: "t1" }],
    ["a term that is not text", { ...raw, termIds: [1] }],
  ])("refuses %s", (_name, input) => {
    expect(normalizePostInput(input)).toBeNull()
  })

  it("accepts the longest texts", () => {
    expect(
      normalizePostInput({ title: "x".repeat(120), body: "y".repeat(5000), termIds: ["t1"] }),
    ).not.toBeNull()
  })
})

describe("areTermsValid", () => {
  const terms = [
    { id: "t1", isCancelled: false },
    { id: "t2", isCancelled: true },
  ]

  it("accepts active terms of the event", () => {
    expect(areTermsValid(["t1"], terms)).toBe(true)
  })

  it.each([
    ["no term", []],
    ["a cancelled term", ["t1", "t2"]],
    ["a term of another event", ["t1", "t9"]],
  ])("refuses %s", (_name, ids) => {
    expect(areTermsValid(ids, terms)).toBe(false)
  })
})
