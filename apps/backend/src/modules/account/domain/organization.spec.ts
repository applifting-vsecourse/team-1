import { isCzechBankAccount } from "@/modules/account/domain/organization"

describe("Czech bank account validation", () => {
  it.each(["1/0001", "1234567890/9999", "1-1/0800", "123456-1234567890/0800"])(
    "accepts %s",
    (account) => {
      expect(isCzechBankAccount(account)).toBe(true)
    },
  )

  it.each([
    "",
    "1",
    "1/123",
    "1/12345",
    "12345678901/0800",
    "1234567-1/0800",
    "a/0800",
    " 1/0800 ",
  ])("rejects %s", (account) => {
    expect(isCzechBankAccount(account)).toBe(false)
  })
})
