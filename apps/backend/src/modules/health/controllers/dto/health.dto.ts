import { HEALTH_NOTE_MAX_LENGTH, HealthRecord } from "@/modules/health/domain/health"
import { ApiProperty } from "@nestjs/swagger"
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator"

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

  @ApiProperty({
    required: false,
    description: "Confirms having no health restriction (US-150); refused with a non-empty note.",
  })
  @IsOptional()
  @IsBoolean()
  noRestriction?: boolean
}

export class SaveOrganizerHealthRequestDto {
  @ApiProperty({
    maxLength: HEALTH_NOTE_MAX_LENGTH,
    description: "Health restriction of the participant. Required unless noRestriction is set.",
  })
  @IsString()
  @MaxLength(HEALTH_NOTE_MAX_LENGTH)
  note!: string

  @ApiProperty({
    required: false,
    description: "Confirms that the participant has no health restriction; refused with a note.",
  })
  @IsOptional()
  @IsBoolean()
  noRestriction?: boolean

  @ApiProperty({
    description:
      "The organizer confirms having the explicit consent of the applicant. Without true nothing is saved.",
  })
  @IsBoolean()
  consentConfirmed!: boolean
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

  @ApiProperty({ description: "The first entry is possible: a term is not over or cancelled." })
  editable!: boolean

  @ApiProperty({ description: "The participant confirmed having no health restriction." })
  noRestriction!: boolean

  @ApiProperty({ type: String, nullable: true, description: "ISO datetime of the consent." })
  consentAt!: string | null

  @ApiProperty({
    nullable: true,
    description: "Change request awaiting the organizer (empty note = removal); null if none.",
    type: "object",
    properties: { note: { type: "string" }, createdAt: { type: "string" } },
  })
  pendingRequest!: { note: string; createdAt: string } | null

  static fromDomain(record: HealthRecord): HealthResponseDto {
    return {
      ...record,
      consentAt: record.consentAt?.toISOString() ?? null,
      pendingRequest: record.pendingRequest
        ? {
            note: record.pendingRequest.note,
            createdAt: record.pendingRequest.createdAt.toISOString(),
          }
        : null,
    }
  }
}
