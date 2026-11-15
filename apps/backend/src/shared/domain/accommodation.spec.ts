import { normalizeAccommodation } from "@/shared/domain/accommodation"

describe("normalizeAccommodation", () => {
  it("keeps the trimmed note of a request", () => {
    expect(normalizeAccommodation(true, "  Ground floor  ")).toEqual({
      individualAccommodation: true,
      accommodationRequest: "Ground floor",
    })
  })

  it("stores a request without a note, or with a blank one, as no note", () => {
    expect(normalizeAccommodation(true, undefined).accommodationRequest).toBeNull()
    expect(normalizeAccommodation(true, "   ").accommodationRequest).toBeNull()
  })

  it("drops the note when there is no request", () => {
    expect(normalizeAccommodation(false, "Ground floor")).toEqual({
      individualAccommodation: false,
      accommodationRequest: null,
    })
    expect(normalizeAccommodation(undefined, "Ground floor").individualAccommodation).toBe(false)
  })
})
