import { plainToInstance } from "class-transformer"
import { validate } from "class-validator"
import { ManualApplicationRequestDto } from "./manual-application.dto"

describe("ManualApplicationRequestDto phone", () => {
  it.each(["       ", "-------", "( ) - ( )", "123 456", "+", "123456x", 777123456])(
    "rejects a phone without seven real digits or with invalid characters: %j",
    async (phone) => {
      const dto = plainToInstance(ManualApplicationRequestDto, { phone })
      expect((await validate(dto)).some((error) => error.property === "phone")).toBe(true)
    },
  )

  it.each([
    [" +420 (777) 123-456 ", "+420777123456"],
    ["1234567", "1234567"],
  ])("normalizes a valid formatted phone %j before validation", async (phone, normalized) => {
    const dto = plainToInstance(ManualApplicationRequestDto, { phone })
    expect(dto.phone).toBe(normalized)
    expect((await validate(dto)).some((error) => error.property === "phone")).toBe(false)
  })
})
