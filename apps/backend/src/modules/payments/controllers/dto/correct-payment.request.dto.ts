import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator"

export class CorrectPaymentRequestDto {
  @ApiProperty({ description: "Stable UUID of the replacement receipt." })
  @IsUUID("4")
  requestId!: string

  @ApiProperty({ minimum: 1, maximum: 2147483647 })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  amountCzk!: number

  @ApiPropertyOptional({ description: "Omit for a summary payment; required for a refund." })
  @IsOptional()
  @IsString()
  termId?: string
}
