import { MAX_ACCOMMODATION_NOTE_LENGTH } from "@/shared/domain/accommodation"
import { MAX_PHONE_INPUT_LENGTH } from "@/shared/domain/phone"
import { ApiProperty } from "@nestjs/swagger"
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator"

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

  @ApiProperty({
    example: "+420 777 123 456",
    nullable: true,
    required: false,
    description: "Optional; empty means no phone. A filled-in one is checked in the service.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_PHONE_INPUT_LENGTH)
  phone?: string | null

  @ApiProperty()
  @IsBoolean()
  individualAccommodation!: boolean

  @ApiProperty({ nullable: true, maxLength: MAX_ACCOMMODATION_NOTE_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_ACCOMMODATION_NOTE_LENGTH)
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
  @ApiProperty() individualAccommodation!: boolean
  @ApiProperty({ nullable: true, type: String }) accommodationRequest!: string | null
  @ApiProperty({ type: [ApplicationEditEntryDto] }) history!: ApplicationEditEntryDto[]
}
