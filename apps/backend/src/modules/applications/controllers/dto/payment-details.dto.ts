import { PaymentStatus } from "@/modules/applications/domain/pricing"
import { ApiProperty } from "@nestjs/swagger"

export class PaymentSummaryDto {
  @ApiProperty({
    example: "12345000",
    description: "Summary symbol (application number × 1000): pays the whole current debt.",
  })
  variableSymbol!: string

  @ApiProperty({
    example: 1200,
    description: "Sum of the debts of the terms; an overpaid term is not set off, whole CZK.",
  })
  payableCzk!: number
}

export class TermPaymentDetailDto {
  @ApiProperty() termId!: string

  @ApiProperty({ example: 1, description: "Term number within the event, 1–999." })
  termNumber!: number

  @ApiProperty({
    example: "12345001",
    description: "Application number × 1000 + term number: pays this term only.",
  })
  variableSymbol!: string

  @ApiProperty({ example: 500, description: "Frozen price of the confirmed term, whole CZK." })
  dueCzk!: number

  @ApiProperty({ example: 500 }) paidCzk!: number

  @ApiProperty({ example: 0, description: "Due − paid; negative is an overpayment of this term." })
  owedCzk!: number

  @ApiProperty({ enum: ["NOTHING_DUE", "UNPAID", "PARTIALLY_PAID", "PAID", "OVERPAID"] })
  paymentStatus!: PaymentStatus
}
