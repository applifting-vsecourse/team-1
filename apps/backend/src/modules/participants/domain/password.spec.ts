import { isValidPassword } from "./password"

describe("isValidPassword", () => {
  it("accepts 8 characters or more", () => {
    expect(isValidPassword("12345678")).toBe(true)
    expect(isValidPassword("a much longer passphrase")).toBe(true)
  })

  it("refuses a shorter or non-string password", () => {
    expect(isValidPassword("1234567")).toBe(false)
    expect(isValidPassword("")).toBe(false)
    expect(isValidPassword(undefined)).toBe(false)
    expect(isValidPassword(12345678)).toBe(false)
  })
})
