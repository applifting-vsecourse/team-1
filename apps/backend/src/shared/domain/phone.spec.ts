import { isValidPhone, normalizePhone } from "./phone"

// Keep these examples identical to apps/frontend/src/lib/phone.test.ts: the two apps hold
// copies of one definition and must agree on every one of them.
const VALID: [string, string][] = [
  ["+420 777 123 456", "+420777123456"],
  [" +420 (777) 123-456 ", "+420777123456"],
  ["777.123.456", "777123456"],
  ["1234567", "1234567"],
  ["+123456789012345", "+123456789012345"],
]
const INVALID = [
  "abc",
  "123456x",
  "+420 777 abc",
  "123456",
  "+",
  "++420777123456",
  "420+777123456",
  "+1234567890123456",
  "123454623123121221212121212112",
  "+-+-+-+",
]

describe("phone", () => {
  it.each(VALID)("accepts and normalizes %j", (raw, normalized) => {
    expect(normalizePhone(raw)).toBe(normalized)
    expect(isValidPhone(normalizePhone(raw))).toBe(true)
  })

  it.each(INVALID)("rejects %j", (raw) => {
    expect(isValidPhone(normalizePhone(raw))).toBe(false)
  })

  // The phone is required: no phone is not valid.
  it.each(["", "   ", "( ) - ( )", null, undefined])(
    "treats %j as no phone, which is not valid",
    (raw) => {
      expect(normalizePhone(raw)).toBeNull()
      expect(isValidPhone(normalizePhone(raw))).toBe(false)
    },
  )
})
