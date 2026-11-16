import { UnmatchedReason } from "@/modules/payments/domain/bank-statement"
import { StoredBankTransaction } from "@/modules/payments/repositories/bank-transactions.repository"
import { StatementImportResult } from "@/modules/payments/services/bank-statements.service"
import { ApiProperty } from "@nestjs/swagger"

export class StatementImportResponseDto {
  @ApiProperty() matchedCount!: number
  @ApiProperty() matchedCzk!: number
  @ApiProperty() unmatchedCount!: number
  @ApiProperty() unmatchedCzk!: number
  @ApiProperty({ description: "Matched payments above what the application owed" })
  overpaidCount!: number
  @ApiProperty() overpaidCzk!: number
  @ApiProperty({ description: "Already imported by an earlier upload, not counted again" })
  duplicateCount!: number
  @ApiProperty({ description: "Outgoing transactions, not payments" }) ignoredCount!: number

  static fromDomain(result: StatementImportResult): StatementImportResponseDto {
    return { ...result }
  }
}

const REASONS: UnmatchedReason[] = [
  "NO_VARIABLE_SYMBOL",
  "UNKNOWN_VARIABLE_SYMBOL",
  "UNSUPPORTED_CURRENCY",
  "AMOUNT_NOT_WHOLE",
]

class UnmatchedTransactionDto {
  @ApiProperty() id!: string
  @ApiProperty({ description: "YYYY-MM-DD" }) bookedOn!: string
  @ApiProperty({ description: "Hundredths of CZK" }) amountCents!: number
  @ApiProperty({ nullable: true, type: String }) variableSymbol!: string | null
  @ApiProperty({ nullable: true, type: String }) counterpartyName!: string | null
  @ApiProperty({ nullable: true, type: String }) message!: string | null
  @ApiProperty({ enum: REASONS }) reason!: UnmatchedReason
  @ApiProperty({
    nullable: true,
    type: String,
    description: "Application the symbol points to, if any",
  })
  applicationId!: string | null
  @ApiProperty({ nullable: true, type: String }) applicantName!: string | null
}

export class UnmatchedTransactionsResponseDto {
  @ApiProperty({ type: [UnmatchedTransactionDto] }) transactions!: UnmatchedTransactionDto[]

  static fromDomain(rows: StoredBankTransaction[]): UnmatchedTransactionsResponseDto {
    return {
      transactions: rows.map((row) => ({
        id: row.id,
        bookedOn: row.bookedOn.toISOString().slice(0, 10),
        amountCents: row.amountCents,
        variableSymbol: row.variableSymbol,
        counterpartyName: row.counterpartyName,
        message: row.message,
        reason: row.reason,
        applicationId: row.application?.id ?? null,
        applicantName: row.application
          ? `${row.application.firstName} ${row.application.lastName}`
          : null,
      })),
    }
  }
}
