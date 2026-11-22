import { CandidateSource } from "@/modules/payments/domain/application-candidates"
import { ApiProperty } from "@nestjs/swagger"
import { IsString, MaxLength, MinLength } from "class-validator"

export class MatchBankTransactionRequestDto {
  @ApiProperty({ description: "Application the payment is assigned to" })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  applicationId!: string

  @ApiProperty({ description: "Term of that application the payment is for" })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  termId!: string
}

class CandidateTermDto {
  @ApiProperty() termId!: string
  @ApiProperty() termNumber!: number
  @ApiProperty({ nullable: true, type: String }) name!: string | null
  @ApiProperty({ description: "YYYY-MM-DD" }) startsOn!: string
  @ApiProperty({ description: "YYYY-MM-DD" }) endsOn!: string
  @ApiProperty({ enum: ["TO_EVALUATE", "CONFIRMED", "WAITLISTED", "CANCELLED", "ARCHIVED"] })
  status!: string
  @ApiProperty({ description: "Due minus paid in whole CZK; negative = an overpayment" })
  owedCzk!: number
  @ApiProperty({ description: "Paid in whole CZK" }) paidCzk!: number
}

class CandidateDto {
  @ApiProperty() id!: string
  @ApiProperty({
    description: "Number of the application; its variable symbol is number × 1000 + term",
  })
  number!: number
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty({ type: [CandidateTermDto] }) terms!: CandidateTermDto[]
}

export class ApplicationCandidatesResponseDto {
  @ApiProperty({ type: [CandidateDto] }) candidates!: CandidateDto[]

  static fromDomain(rows: CandidateSource[]): ApplicationCandidatesResponseDto {
    return { candidates: rows.map((row) => ({ ...row, terms: row.terms.map((t) => ({ ...t })) })) }
  }
}
