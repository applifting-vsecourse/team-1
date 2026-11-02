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
  @ApiProperty({ type: [ReceiptRowResponseDto], description: "The split over the terms." })
  rows!: ReceiptRowResponseDto[]
}

class PaymentTermResponseDto {
  @ApiProperty() termId!: string
  @ApiProperty() termNumber!: number
  @ApiProperty({ example: "12345001", description: "Pays this term only." })
  variableSymbol!: string
  @ApiProperty({ enum: ["CONFIRMED", "WAITLISTED", "CANCELLED"] }) status!: string
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
}

export class PaymentApplicationResponseDto {
  @ApiProperty() id!: string
  @ApiProperty() eventId!: string
  @ApiProperty() eventName!: string
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty() code!: string
  @ApiProperty({ example: "12345000", description: "Summary symbol: pays the whole debt." })
  variableSymbol!: string
  @ApiProperty() amountDueCzk!: number
  @ApiProperty() amountPaidCzk!: number
  @ApiProperty({ description: "Due minus paid; negative means an overpayment." })
  amountOwedCzk!: number
  @ApiProperty({ description: "What a summary payment settles now; overpaid terms not set off." })
  payableCzk!: number
  @ApiProperty({ type: [PaymentTermResponseDto] }) terms!: PaymentTermResponseDto[]
  @ApiProperty({ type: [PaymentResponseDto], description: "Receipts, oldest first." })
  payments!: PaymentResponseDto[]

  static fromDomain(application: ReturnType<typeof paymentSummary>): PaymentApplicationResponseDto {
    return {
      id: application.id,
      eventId: application.eventId,
      eventName: application.eventName,
      firstName: application.firstName,
      lastName: application.lastName,
      code: toApplicationCode(application.eventName, application.number),
      variableSymbol: application.variableSymbol,
      amountDueCzk: application.amountDueCzk,
      amountPaidCzk: application.amountPaidCzk,
      amountOwedCzk: application.amountOwedCzk,
      payableCzk: application.payableCzk,
      terms: application.terms.map((term) => ({
        termId: term.termId,
        termNumber: term.termNumber,
        variableSymbol: term.variableSymbol,
        status: term.status,
        priceCzk: term.priceCzk,
        startsOn: term.startsOn.toISOString().slice(0, 10),
        endsOn: term.endsOn.toISOString().slice(0, 10),
        dueCzk: term.dueCzk,
        paidCzk: term.paidCzk,
        owedCzk: term.owedCzk,
        paymentStatus: term.paymentStatus,
      })),
      payments: application.receipts.map((receipt) => ({
        id: receipt.id,
        amountCzk: receipt.amountCzk,
        recordedByName: receipt.recordedByName,
        createdAt: receipt.createdAt.toISOString(),
        rows: receipt.rows,
      })),
    }
  }
}
