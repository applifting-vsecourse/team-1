import { ApiProperty } from "@nestjs/swagger"
import { IsString, Matches, ValidateIf } from "class-validator"

export class CancellationStartRequestDto {
  @ApiProperty({ type: String, nullable: true, example: "2027-07-01" })
  @ValidateIf((_, value: unknown) => value !== null)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  cancellationStartsOn!: string | null
}
