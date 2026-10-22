import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator"

export class CreateEventDto {
  @ApiPropertyOptional({
    description:
      "Organization the event belongs to. Required when the organizer belongs to more than one.",
  })
  @IsOptional()
  @IsString()
  organizationId?: string

  @ApiProperty({ example: "Letní kemp 2027" })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string

  @ApiPropertyOptional({ example: "Dva týdny her a sportu u Lipna." })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string

  @ApiPropertyOptional({ example: "Lipno nad Vltavou" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string
}
