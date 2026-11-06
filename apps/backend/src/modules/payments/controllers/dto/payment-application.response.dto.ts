import { toApplicationCode } from "@/modules/participants/domain/my-application"
import { paymentSummary } from "@/modules/payments/domain/payment"
import { ApiProperty } from "@nestjs/swagger"

class ReceiptRowResponseDto {
  @ApiProperty() applicationTermId!: string
  @ApiProperty() termId!: string
  @ApiProperty() termNumber!: number
  @ApiProperty({ description: "Money of this receipt on this term; negative for a refund." })
  amountCzk!: number
}

class PaymentResponseDto {
  @ApiProperty({ description: "Receipt id — what `DELETE` takes. One entry per receipt." })
  id!: string
  @ApiProperty({ description: "Total of the receipt, whole CZK; negative for a recorded refund." })
  amountCzk!: number
  @ApiProperty() recordedByName!: string
  @ApiProperty() createdAt!: string
  @ApiProperty({ nullable: true, type: String }) cancelledAt!: string | null
  @ApiProperty({ nullable: true, type: String }) correctsReceiptId!: string | null
  @ApiProperty({ nullable: true, type: Boolean }) isSummary!: boolean | null
  @ApiProperty({ type: [ReceiptRowResponseDto], description: "The split over the terms." })
  rows!: ReceiptRowResponseDto[]
}

class PaymentTermResponseDto {
  @ApiProperty() termId!: string
  @ApiProperty() termNumber!: number
  @ApiProperty({ nullable: true, type: String, description: "Optional name of the term." })
  name!: string | null
  @ApiProperty({ example: "12345001", description: "Pays this term only." })
  variableSymbol!: string
  @ApiProperty({ enum: ["TO_EVALUATE", "CONFIRMED", "WAITLISTED", "CANCELLED"] }) status!: string
  @ApiProperty() priceCzk!: number
  @ApiProperty() startsOn!: string
  @ApiProperty() endsOn!: string
  @ApiProperty({ description: "Frozen price when the term is confirmed, otherwise 0." })
  dueCzk!: number
  @ApiProperty() paidCzk!: number
  @ApiProperty({ description: "Due minus paid; negative means an overpayment of this term." })
  owedCzk!: number
  @ApiProperty({ enum: ["NOTHING_DUE", "UNPAID", "PARTIALLY_PAID", "PAID", "OVERPAID"] })
  paymentStatus!: string
  @ApiProperty({ description: "Limit of a refund for this term: its overpayment, 0 without one." })
  refundableCzk!: number
  @ApiProperty({
    nullable: true,
    type: String,
    description: "Restarted payment deadline; null without a renewed period or debt.",
  })
  paymentDueAt!: string | null
}

export class PaymentApplicationResponseDto {
  @ApiProperty() id!: string
  @ApiProperty() eventId!: string
  @ApiProperty() eventName!: string
  @ApiProperty({ example: "2900123456/2010", description: "Account payments are sent to." })
  bankAccount!: string
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty({ nullable: true, type: String }) accommodationRequest!: string | null
  @ApiProperty() code!: string
  @ApiProperty({ example: "12345000", description: "Summary symbol: pays the whole debt." })
  variableSymbol!: string
  @ApiProperty() amountDueCzk!: number
  @ApiProperty() amountPaidCzk!: number
  @ApiProperty({ description: "Due minus paid; negative means an overpayment." })
  amountOwedCzk!: number
  @ApiProperty({ description: "What a summary payment settles now; overpaid terms not set off." })
  payableCzk!: number
  @ApiProperty({
    nullable: true,
    type: String,
    description: "Term a refund is offered for first (the most overpaid); null = refund disabled.",
  })
  refundableTermId!: string | null
  @ApiProperty({ type: [PaymentTermResponseDto] }) terms!: PaymentTermResponseDto[]
  @ApiProperty({ type: [PaymentResponseDto], description: "Receipts, oldest first." })
  payments!: PaymentResponseDto[]

  static fromDomain(application: ReturnType<typeof paymentSummary>): PaymentApplicationResponseDto {
    return {
      id: application.id,
      eventId: application.eventId,
      eventName: application.eventName,
      bankAccount: application.bankAccount,
      firstName: application.firstName,
      lastName: application.lastName,
      accommodationRequest: application.accommodationRequest,
      code: toApplicationCode(application.eventName, application.number),
      variableSymbol: application.variableSymbol,
      amountDueCzk: application.amountDueCzk,
      amountPaidCzk: application.amountPaidCzk,
      amountOwedCzk: application.amountOwedCzk,
      payableCzk: application.payableCzk,
      refundableTermId: application.refundableTermId,
      terms: application.terms.map((term) => ({
        termId: term.termId,
        termNumber: term.termNumber,
        name: term.termName,
        variableSymbol: term.variableSymbol,
        status: term.status,
        priceCzk: term.priceCzk,
        startsOn: term.startsOn.toISOString().slice(0, 10),
        endsOn: term.endsOn.toISOString().slice(0, 10),
        dueCzk: term.dueCzk,
        paidCzk: term.paidCzk,
        owedCzk: term.owedCzk,
        paymentStatus: term.paymentStatus,
        refundableCzk: term.refundableCzk,
        paymentDueAt: term.paymentDueAt?.toISOString() ?? null,
      })),
      payments: application.receipts.map((receipt) => ({
        id: receipt.id,
        amountCzk: receipt.amountCzk,
        recordedByName: receipt.recordedByName,
        createdAt: receipt.createdAt.toISOString(),
        cancelledAt: receipt.cancelledAt?.toISOString() ?? null,
        correctsReceiptId: receipt.correctsReceiptId,
        isSummary: receipt.isSummary,
        rows: receipt.rows,
      })),
    }
  }
}
