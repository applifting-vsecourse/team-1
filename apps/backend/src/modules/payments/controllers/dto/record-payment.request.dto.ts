import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsInt, IsUUID, Max, Min, ValidateIf } from "class-validator"

export class RecordPaymentRequestDto {
  @ApiProperty({
    description: "Stable UUID for this submission. Retrying it never adds a second receipt.",
  })
  @IsUUID("4")
  requestId!: string

  @ApiPropertyOptional({
    description: "Amount of this receipt in whole CZK. Omit to settle the remaining debt.",
    minimum: 1,
    maximum: 2147483647,
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  amountCzk?: number
}
