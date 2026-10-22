import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsInt, Max, Min, ValidateIf } from "class-validator"

export class RecordPaymentRequestDto {
  @ApiPropertyOptional({
    description: "Whole CZK. Omit for the current full amount due.",
    minimum: 0,
    maximum: 2147483647,
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  amountCzk?: number
}
