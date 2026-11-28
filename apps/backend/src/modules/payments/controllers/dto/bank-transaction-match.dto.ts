import { CandidateWithAfterPayment } from "@/modules/payments/domain/application-candidates"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsInt, IsOptional, IsString, MaxLength, MinLength } from "class-validator"

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

  @ApiProperty({
    description: "Amount of the transaction the organizer confirmed, hundredths of the currency",
  })
  @IsInt()
  amountCents!: number

  @ApiPropertyOptional({
    description: "Previous assignment receipt shown for a reopened transaction",
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  previousReceiptId?: string
}

/** A repeated parameter arrives as an array and is refused. */
export class ApplicationCandidatesQueryDto {
  @ApiPropertyOptional({ description: "Part of the name, variable symbol or application number" })
  @IsOptional()
  @IsString()
  q?: string

  @ApiPropertyOptional({ description: "Transaction whose payment the terms are previewed with" })
  @IsOptional()
  @IsString()
  transactionId?: string
}

class AfterPaymentDto {
  @ApiProperty({ description: "Paid before the payment, whole CZK" }) fromCzk!: number
  @ApiProperty({ description: "Paid after the payment, whole CZK" }) toCzk!: number
  @ApiProperty({ description: "Still owed after the payment" }) restCzk!: number
  @ApiProperty({ description: "Overpayment after the payment" }) overCzk!: number
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
  @ApiProperty({
    type: AfterPaymentDto,
    nullable: true,
    description: "What the payment of the requested transaction does to the term; null without one",
  })
  afterPayment!: AfterPaymentDto | null
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

  static fromDomain(rows: CandidateWithAfterPayment[]): ApplicationCandidatesResponseDto {
    return { candidates: rows.map((row) => ({ ...row, terms: row.terms.map((t) => ({ ...t })) })) }
  }
}
