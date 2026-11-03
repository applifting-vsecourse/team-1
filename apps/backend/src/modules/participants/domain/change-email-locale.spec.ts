import { resolveChangeEmailLocale } from "./change-email-locale"

describe("resolveChangeEmailLocale (D-078)", () => {
  it("takes the preferred language of the user over the language of the application", () => {
    expect(resolveChangeEmailLocale({ userLocale: "cs", firstApplicationLocale: "en" })).toBe("cs")
  })

  it("takes the language of the first application when the user has set none", () => {
    expect(resolveChangeEmailLocale({ userLocale: "en", firstApplicationLocale: "cs" })).toBe("cs")
    expect(resolveChangeEmailLocale({ userLocale: "en", firstApplicationLocale: "en" })).toBe("en")
  })

  it("takes the language of the application when there is no account", () => {
    expect(resolveChangeEmailLocale({ userLocale: null, firstApplicationLocale: "cs" })).toBe("cs")
  })
})
