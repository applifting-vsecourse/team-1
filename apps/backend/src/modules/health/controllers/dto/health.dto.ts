import { HEALTH_NOTE_MAX_LENGTH, HealthRecord } from "@/modules/health/domain/health"
import { ApiProperty } from "@nestjs/swagger"
import { IsBoolean, IsString, MaxLength } from "class-validator"

export class SaveHealthRequestDto {
  @ApiProperty({
    maxLength: HEALTH_NOTE_MAX_LENGTH,
    description: "Health restriction of the participant. Empty removes it.",
  })
  @IsString()
  @MaxLength(HEALTH_NOTE_MAX_LENGTH)
  note!: string

  @ApiProperty({ description: "Explicit consent with processing; required for a non-empty note." })
  @IsBoolean()
  consent!: boolean
}

export class HealthResponseDto {
  @ApiProperty()
  applicationId!: string

  @ApiProperty()
  eventName!: string

  @ApiProperty()
  firstName!: string

  @ApiProperty()
  lastName!: string

  @ApiProperty({ type: String, nullable: true })
  note!: string | null

  @ApiProperty({ type: String, nullable: true, description: "ISO datetime of the consent." })
  consentAt!: string | null

  static fromDomain(record: HealthRecord): HealthResponseDto {
    return { ...record, consentAt: record.consentAt?.toISOString() ?? null }
  }
}
