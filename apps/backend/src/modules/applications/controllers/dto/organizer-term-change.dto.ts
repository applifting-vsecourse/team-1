import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import { TermChangeImpact } from "@/modules/applications/domain/organizer-term-change"
import { WithdrawalImpact } from "@/modules/applications/domain/organizer-withdrawal"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
} from "class-validator"

export class OrganizerTermChangeRequestDto {
  @ApiProperty({ type: [String], description: "All terms the application should be in" })
  @IsArray()
  @ArrayMaxSize(999)
  @ArrayUnique()
  @IsString({ each: true })
  termIds!: string[]

  @ApiPropertyOptional({
    description: "Confirm knowingly even though a new term has no free bed of the gender.",
  })
  @IsOptional()
  @IsBoolean()
  confirmOverCapacity?: boolean
}

export class OrganizerTermChangePreviewQueryDto {
  @ApiProperty({ type: [String], description: "Comma-separated ids of the terms to end up in" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.split(",").filter((id) => id !== "") : value,
  )
  @IsArray()
  @ArrayMaxSize(999)
  @ArrayUnique()
  @IsString({ each: true })
  termIds!: string[]
}

class AddedTermImpactDto {
  @ApiProperty() termId!: string
  @ApiProperty() priceCzk!: number
  @ApiProperty({ description: "Already paid in the term (a reactivated one keeps its payments)" })
  paidCzk!: number
  @ApiProperty({ description: "A bed of the applicant's gender is free" }) fits!: boolean
  @ApiProperty({ description: "Beds the applicant's gender can use in the term" })
  genderCapacity!: number
  @ApiProperty({ description: "Free beds for the applicant's gender; below 1 = does not fit" })
  genderFree!: number
}

class RemovedTermImpactDto {
  @ApiProperty() termId!: string
  @ApiProperty() paidCzk!: number
  @ApiProperty() overpaymentCzk!: number
}

export class OrganizerTermChangePreviewResponseDto {
  @ApiProperty({ enum: ["FEMALE", "MALE"] }) gender!: "FEMALE" | "MALE"
  @ApiProperty() newPriceCzk!: number
  @ApiProperty() amountToPayCzk!: number
  @ApiProperty() overpaymentCzk!: number
  @ApiProperty({ type: [AddedTermImpactDto] }) added!: AddedTermImpactDto[]
  @ApiProperty({ type: [RemovedTermImpactDto] }) removed!: RemovedTermImpactDto[]

  static fromDomain(impact: TermChangeImpact): OrganizerTermChangePreviewResponseDto {
    return impact
  }
}

export class OrganizerTermChangeResponseDto {
  @ApiProperty({ description: "False when the selection did not differ from the current one" })
  changed!: boolean
  @ApiProperty() changedAt!: string
  @ApiProperty({ nullable: true, type: String }) changedByName!: string | null
}

export class OrganizerTermOptionDto {
  @ApiProperty() id!: string
  @ApiProperty({ nullable: true, type: String }) name!: string | null
  @ApiProperty() startsOn!: string
  @ApiProperty() endsOn!: string
  @ApiProperty({ description: "The application is in the term now" }) selected!: boolean
}

export class OrganizerWithdrawalRequestDto {
  @ApiProperty({ type: [String], description: "Terms the participant is withdrawn from (US-32)" })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(999)
  @ArrayUnique()
  @IsString({ each: true })
  termIds!: string[]
}

class WithdrawalTermImpactDto {
  @ApiProperty() termId!: string
  @ApiProperty({ enum: ["TO_EVALUATE", "CONFIRMED", "WAITLISTED", "CANCELLED"] })
  status!: ApplicationTermStatus
  @ApiProperty() isWithdrawn!: boolean
  @ApiProperty({ description: "False for a waitlisted or not yet evaluated term" })
  hasFinancialImpact!: boolean
  @ApiProperty() paidCzk!: number
  @ApiProperty({ description: "Debt of the term after the withdrawal" }) debtCzk!: number
  @ApiProperty({ description: "Overpayment of the term after the withdrawal" })
  overpaymentCzk!: number
}

export class OrganizerWithdrawalPreviewResponseDto {
  @ApiProperty({ type: [WithdrawalTermImpactDto] }) terms!: WithdrawalTermImpactDto[]
  @ApiProperty() overpaymentCzk!: number

  static fromDomain(impact: WithdrawalImpact): OrganizerWithdrawalPreviewResponseDto {
    return impact
  }
}

export class OrganizerWithdrawalResponseDto {
  @ApiProperty() changedAt!: string
  @ApiProperty({ nullable: true, type: String }) changedByName!: string | null
}
