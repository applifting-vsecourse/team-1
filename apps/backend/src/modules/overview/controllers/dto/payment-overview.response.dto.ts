import { PaymentOverview } from "@/modules/overview/domain/payment-overview"
import { ApiProperty } from "@nestjs/swagger"

class PaymentOverviewEntryDto {
  @ApiProperty() applicationId!: string
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty() termId!: string
  @ApiProperty({ nullable: true, type: String }) termName!: string | null
  @ApiProperty({ enum: ["NOTHING_DUE", "UNPAID", "PARTIALLY_PAID", "PAID", "OVERPAID"] })
  paymentStatus!: string
  @ApiProperty() amountDueCzk!: number
  @ApiProperty() amountPaidCzk!: number
  @ApiProperty() amountOwedCzk!: number
  @ApiProperty() paymentDueAt!: string
  @ApiProperty() overdue!: boolean
  @ApiProperty() reminderCount!: number
  @ApiProperty({ nullable: true, type: String }) lastReminderAt!: string | null
}

export class PaymentOverviewResponseDto {
  @ApiProperty() totalDebtCzk!: number
  @ApiProperty() debtorCount!: number
  @ApiProperty() overdueCount!: number
  @ApiProperty({ type: [PaymentOverviewEntryDto] }) entries!: PaymentOverviewEntryDto[]

  static fromDomain(data: PaymentOverview): PaymentOverviewResponseDto {
    return {
      totalDebtCzk: data.totalDebtCzk,
      debtorCount: data.debtorCount,
      overdueCount: data.overdueCount,
      entries: data.entries.map((entry) => ({
        ...entry,
        paymentDueAt: entry.paymentDueAt.toISOString(),
        lastReminderAt: entry.lastReminderAt?.toISOString() ?? null,
      })),
    }
  }
}
