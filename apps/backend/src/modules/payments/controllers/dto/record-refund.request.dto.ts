import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator"

export class RecordRefundRequestDto {
  @ApiProperty()
  @IsUUID("4")
  requestId!: string

  @ApiProperty({
    description: "Money already returned, in whole CZK",
    minimum: 1,
    maximum: 2147483647,
  })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  amountCzk!: number

  @ApiPropertyOptional({
    description: "Term the money is returned for. Required — a missing one is an error.",
  })
  @IsOptional()
  @IsString()
  termId?: string
}
