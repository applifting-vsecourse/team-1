import { CZECH_BANK_ACCOUNT_PATTERN } from "@/modules/account/domain/organization"
import { ApiProperty } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator"

export class CreateOrganizationDto {
  @ApiProperty({ example: "Lipno Events" })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string
}

export class UpdateOrganizationProfileDto {
  @ApiProperty({ example: "info@lipno.example.cz" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  // Same limit as the event's own contact e-mail, which the form of public details pre-fills from here.
  @MaxLength(200)
  contactEmail!: string

  @ApiProperty({ required: false, example: "+420 777 123 456" })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(40)
  contactPhone?: string

  @ApiProperty({ example: "2900123456/2010" })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @Matches(CZECH_BANK_ACCOUNT_PATTERN)
  bankAccount!: string
}
