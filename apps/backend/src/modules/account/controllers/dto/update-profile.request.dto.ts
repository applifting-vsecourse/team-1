import { Locale, LOCALES } from "@/core/email/locale"
import { ApiPropertyOptional } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import { IsIn, IsString, MaxLength, MinLength, ValidateIf } from "class-validator"

export const MAX_NAME_LENGTH = 200

export class UpdateProfileRequestDto {
  @ApiPropertyOptional({ example: "Eva Malá", maxLength: MAX_NAME_LENGTH })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_NAME_LENGTH)
  name?: string

  @ApiPropertyOptional({
    enum: ["en", "cs"],
    description:
      "Preferred language: the UI and e-mails to this account (D-069). Left out, it stays as it is (possibly unset).",
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(LOCALES)
  locale?: Locale
}
