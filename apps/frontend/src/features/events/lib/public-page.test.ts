import { describe, expect, it } from "vitest"

import { validatePublicPage } from "@/features/events/lib/public-page"

const filled = {
  name: "Letní kemp",
  description: "Popis",
  location: "Lipno",
  contactEmail: "info@alpine.example",
  contactPhone: "+420 777 000 001",
  publishedInCatalog: true,
}

describe("validatePublicPage", () => {
  it("accepts a complete page", () => {
    expect(validatePublicPage(filled)).toEqual({})
  })

  it("needs a name", () => {
    expect(validatePublicPage({ ...filled, name: "  " })).toEqual({ name: "nameRequired" })
  })

  it("checks the e-mail and the phone number formats", () => {
    expect(validatePublicPage({ ...filled, contactEmail: "nope", contactPhone: "abc" })).toEqual({
      contactEmail: "emailInvalid",
      contactPhone: "phoneInvalid",
    })
  })

  it("lets an incomplete page be saved while it is not in the catalog", () => {
    expect(
      validatePublicPage({
        ...filled,
        description: "",
        location: "",
        contactEmail: "",
        contactPhone: "",
        publishedInCatalog: false,
      }),
    ).toEqual({})
  })

  it("asks for description, venue and e-mail before the catalog", () => {
    expect(
      validatePublicPage({ ...filled, description: "", location: " ", contactEmail: "" }),
    ).toEqual({
      description: "requiredForCatalog",
      location: "requiredForCatalog",
      contactEmail: "requiredForCatalog",
    })
  })
})
