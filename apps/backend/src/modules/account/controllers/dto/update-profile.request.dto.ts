import { Locale, LOCALES } from "@/core/email/locale"
import { ApiProperty } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import { IsIn, IsString, MaxLength, MinLength } from "class-validator"

export const MAX_NAME_LENGTH = 200

export class UpdateProfileRequestDto {
  @ApiProperty({ example: "Eva Malá", maxLength: MAX_NAME_LENGTH })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_NAME_LENGTH)
  name!: string

  @ApiProperty({
    enum: ["en", "cs"],
    description: "Preferred language: the UI and e-mails to this account (D-069).",
  })
  @IsIn(LOCALES)
  locale!: Locale
}
