import { manualTargets } from "@/modules/applications/domain/status-transition"
import { TermStatusDetail } from "@/modules/applications/domain/term-status"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsBoolean, IsIn, IsOptional } from "class-validator"

const STATUSES = ["CONFIRMED", "WAITLISTED", "CANCELLED"] as const

export class ChangeTermStatusRequestDto {
  @ApiProperty({ enum: STATUSES })
  @IsIn(STATUSES)
  status!: (typeof STATUSES)[number]

  @ApiPropertyOptional({
    description: "Confirm knowingly even though no bed of the applicant's gender is free.",
  })
  @IsOptional()
  @IsBoolean()
  confirmOverCapacity?: boolean
}

class StatusChangeEntryDto {
  @ApiProperty({ enum: STATUSES }) fromStatus!: string
  @ApiProperty({ enum: STATUSES }) toStatus!: string
  @ApiProperty({ nullable: true, type: String, description: "Null: changed by the system" })
  changedByName!: string | null
  @ApiProperty() changedAt!: string
}

export class TermStatusResponseDto {
  @ApiProperty() termId!: string
  @ApiProperty() name!: string
  @ApiProperty() startsOn!: string
  @ApiProperty() endsOn!: string
  @ApiProperty({ enum: STATUSES }) status!: string
  @ApiProperty() priceCzk!: number
  @ApiProperty({ enum: STATUSES, isArray: true, description: "Statuses an organizer may set now" })
  allowedStatuses!: string[]
  @ApiProperty({ type: [StatusChangeEntryDto] }) history!: StatusChangeEntryDto[]

  static fromDomain(term: TermStatusDetail): TermStatusResponseDto {
    return {
      termId: term.termId,
      name: term.name,
      startsOn: term.startsOn.toISOString().slice(0, 10),
      endsOn: term.endsOn.toISOString().slice(0, 10),
      status: term.status,
      priceCzk: term.priceCzk,
      allowedStatuses: manualTargets(term.status),
      history: term.history.map((entry) => ({
        ...entry,
        changedAt: entry.changedAt.toISOString(),
      })),
    }
  }
}
