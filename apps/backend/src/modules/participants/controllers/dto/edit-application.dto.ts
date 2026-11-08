import { ApiProperty } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator"

export class EditApplicationRequestDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string

  @ApiProperty({ example: "2000-05-15" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  birthDate!: string

  @ApiProperty({ example: "+420 777 123 456" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().replace(/[ ()-]/g, "") : value,
  )
  @Matches(/^\+?[0-9]{7,30}$/)
  phone!: string

  @ApiProperty({ nullable: true, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  accommodationRequest!: string | null
}

export class ApplicationEditEntryDto {
  @ApiProperty() id!: string
  @ApiProperty() createdAt!: string
  @ApiProperty() authorName!: string
  @ApiProperty({ type: [String] }) changedFields!: string[]
}

export class EditableApplicationDto {
  @ApiProperty() id!: string
  @ApiProperty() eventName!: string
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty() birthDate!: string
  @ApiProperty({ nullable: true, type: String }) phone!: string | null
  @ApiProperty({ nullable: true, type: String }) accommodationRequest!: string | null
  @ApiProperty({ type: [ApplicationEditEntryDto] }) history!: ApplicationEditEntryDto[]
}
