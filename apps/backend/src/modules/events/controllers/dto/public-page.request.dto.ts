import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator"

export class PublicPageRequestDto {
  @ApiProperty({ example: "Letní kemp Lipno 2027" })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string

  @ApiPropertyOptional({ nullable: true, example: "Týden v přírodě pro děti i dospívající." })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null

  @ApiPropertyOptional({ nullable: true, example: "Lipno nad Vltavou" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string | null

  @ApiPropertyOptional({ nullable: true, example: "info@alpine.example" })
  @ValidateIf((_, value) => value !== undefined && value !== null && value !== "")
  @IsEmail()
  @MaxLength(200)
  contactEmail?: string | null

  @ApiPropertyOptional({ nullable: true, example: "+420 000 000 000" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string | null

  @ApiProperty({ description: "List the event in the public catalog (US-123)." })
  @IsBoolean()
  publishedInCatalog!: boolean
}
