import { toApplicationCode } from "@/modules/participants/domain/my-application"
import { paymentSummary } from "@/modules/payments/domain/payment"
import { ApiProperty } from "@nestjs/swagger"

class PaymentResponseDto {
  @ApiProperty() id!: string
  @ApiProperty() amountCzk!: number
  @ApiProperty() recordedByName!: string
  @ApiProperty() createdAt!: string
}

class PaymentTermResponseDto {
  @ApiProperty({ enum: ["CONFIRMED", "WAITLISTED"] }) status!: string
  @ApiProperty() priceCzk!: number
  @ApiProperty() startsOn!: string
  @ApiProperty() endsOn!: string
}

export class PaymentApplicationResponseDto {
  @ApiProperty() id!: string
  @ApiProperty() eventId!: string
  @ApiProperty() eventName!: string
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty() code!: string
  @ApiProperty() amountDueCzk!: number
  @ApiProperty() amountPaidCzk!: number
  @ApiProperty({ description: "Due minus paid; negative means an overpayment." })
  amountOwedCzk!: number
  @ApiProperty({ type: [PaymentTermResponseDto] }) terms!: PaymentTermResponseDto[]
  @ApiProperty({ type: [PaymentResponseDto] }) payments!: PaymentResponseDto[]

  static fromDomain(application: ReturnType<typeof paymentSummary>): PaymentApplicationResponseDto {
    return {
      id: application.id,
      eventId: application.eventId,
      eventName: application.eventName,
      firstName: application.firstName,
      lastName: application.lastName,
      code: toApplicationCode(application.eventName, application.number),
      amountDueCzk: application.amountDueCzk,
      amountPaidCzk: application.amountPaidCzk,
      amountOwedCzk: application.amountOwedCzk,
      terms: [...application.terms]
        .sort((a, b) => a.startsOn.getTime() - b.startsOn.getTime())
        .map((term) => ({
          ...term,
          startsOn: term.startsOn.toISOString().slice(0, 10),
          endsOn: term.endsOn.toISOString().slice(0, 10),
        })),
      payments: application.payments.map((payment) => ({
        ...payment,
        createdAt: payment.createdAt.toISOString(),
      })),
    }
  }
}
