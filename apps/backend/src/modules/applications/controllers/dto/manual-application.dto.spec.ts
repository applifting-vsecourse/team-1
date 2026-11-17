import { plainToInstance } from "class-transformer"
import { validate } from "class-validator"
import { ManualApplicationRequestDto } from "./manual-application.dto"

const hasPhoneError = async (phone: unknown): Promise<boolean> =>
  (await validate(plainToInstance(ManualApplicationRequestDto, { phone }))).some(
    (error) => error.property === "phone",
  )

// The format of the phone is checked in the service (phone.spec.ts, the int specs), so that the
// error is the localized INVALID_PHONE; the DTO only keeps out what is not usable text.
describe("ManualApplicationRequestDto phone", () => {
  it.each([undefined, null, 777123456, true, {}, "1".repeat(41)])(
    "rejects a phone that is missing or not usable text: %j",
    async (phone) => {
      expect(await hasPhoneError(phone)).toBe(true)
    },
  )

  it.each(["", "abc", "+420 777 123 456"])(
    "lets the text %j through to the service",
    async (phone) => {
      expect(await hasPhoneError(phone)).toBe(false)
    },
  )
})
