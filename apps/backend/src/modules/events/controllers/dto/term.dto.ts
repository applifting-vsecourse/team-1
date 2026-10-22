import { ApiProperty } from "@nestjs/swagger"
import { IsInt, IsString, Matches, Max, MaxLength, Min, MinLength } from "class-validator"

export class TermDto {
  @ApiProperty({ example: "Letní turnus 1" })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string

  @ApiProperty({ example: "2027-07-12", description: "ISO date." })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startsOn!: string

  @ApiProperty({ example: "2027-07-18", description: "ISO date, not before `startsOn`." })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endsOn!: string

  @ApiProperty({ example: 6900, description: "Whole CZK per person for the whole term." })
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  priceCzk!: number
}

export class CancelTermDto {
  @ApiProperty({ example: "Areál není v srpnovém termínu k dispozici" })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reason!: string
}
