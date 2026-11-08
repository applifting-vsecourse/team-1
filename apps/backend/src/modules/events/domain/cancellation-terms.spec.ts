import { CANCELLATION_TERMS_MAX_LENGTH, normalizeCancellationTerms } from "./cancellation-terms"

describe("normalizeCancellationTerms", () => {
  it("trims the text", () => {
    expect(normalizeCancellationTerms("  Celá částka.\n")).toBe("Celá částka.")
  })

  it("rejects an empty text", () => {
    expect(normalizeCancellationTerms("")).toBeNull()
    expect(normalizeCancellationTerms(" \n ")).toBeNull()
  })

  it("accepts the maximum length and rejects more", () => {
    expect(normalizeCancellationTerms("a".repeat(CANCELLATION_TERMS_MAX_LENGTH))).not.toBeNull()
    expect(normalizeCancellationTerms("a".repeat(CANCELLATION_TERMS_MAX_LENGTH + 1))).toBeNull()
  })
})
