import { CANCELLATION_TERMS_MAX_LENGTH } from "@/modules/events/domain/cancellation-terms"
import { ApiProperty } from "@nestjs/swagger"
import { IsString, MaxLength } from "class-validator"

export class CancellationTermsRequestDto {
  @ApiProperty({
    maxLength: CANCELLATION_TERMS_MAX_LENGTH,
    example: "Při odhlášení více než 30 dní před začátkem termínu se vrací celá zaplacená částka.",
  })
  @IsString()
  @MaxLength(CANCELLATION_TERMS_MAX_LENGTH)
  cancellationTerms!: string
}
