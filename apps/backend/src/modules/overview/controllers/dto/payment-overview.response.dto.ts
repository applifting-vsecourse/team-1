import type { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import { PaymentOverview } from "@/modules/overview/domain/payment-overview"
import { ApiProperty } from "@nestjs/swagger"

class PaymentOverviewEntryDto {
  @ApiProperty() variableSymbol!: string
  @ApiProperty() summaryVariableSymbol!: string
  @ApiProperty() payableCzk!: number
  @ApiProperty() applicationId!: string
  @ApiProperty() applicationNumber!: number
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty() termId!: string
  @ApiProperty({ nullable: true, type: String }) termName!: string | null
  @ApiProperty() startsOn!: string
  @ApiProperty() endsOn!: string
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

class DebtByReminderDto {
  @ApiProperty() ALL!: number
  @ApiProperty() SENT!: number
  @ApiProperty() NOT_SENT!: number
}
class DebtByFilterDto {
  @ApiProperty({ type: DebtByReminderDto }) ALL!: DebtByReminderDto
  @ApiProperty({ type: DebtByReminderDto }) UNPAID!: DebtByReminderDto
  @ApiProperty({ type: DebtByReminderDto }) PARTIALLY_PAID!: DebtByReminderDto
  @ApiProperty({ type: DebtByReminderDto }) OVERDUE!: DebtByReminderDto
  @ApiProperty({ type: DebtByReminderDto }) PAID!: DebtByReminderDto
}
export class PaymentOverviewResponseDto {
  @ApiProperty({ type: DebtByFilterDto }) debtByFilter!: DebtByFilterDto
  @ApiProperty() remindedDebtorCount!: number
  @ApiProperty() totalDebtCzk!: number
  @ApiProperty() debtorCount!: number
  @ApiProperty() overdueCount!: number
  @ApiProperty({ type: [PaymentOverviewEntryDto] }) entries!: PaymentOverviewEntryDto[]

  static fromDomain(data: PaymentOverview): PaymentOverviewResponseDto {
    return {
      totalDebtCzk: data.totalDebtCzk,
      debtByFilter: data.debtByFilter,
      remindedDebtorCount: data.remindedDebtorCount,
      debtorCount: data.debtorCount,
      overdueCount: data.overdueCount,
      entries: data.entries.map((entry) => ({
        ...entry,
        startsOn: entry.startsOn.toISOString().slice(0, 10),
        endsOn: entry.endsOn.toISOString().slice(0, 10),
        paymentDueAt: entry.paymentDueAt.toISOString(),
        lastReminderAt: entry.lastReminderAt?.toISOString() ?? null,
      })),
    }
  }
}

export class OutstandingOverpaymentDto {
  @ApiProperty() applicationId!: string
  @ApiProperty() applicationNumber!: number
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty() termId!: string
  @ApiProperty({ nullable: true, type: String }) termName!: string | null
  @ApiProperty() startsOn!: string
  @ApiProperty() endsOn!: string
  @ApiProperty({ enum: ["CONFIRMED", "WAITLISTED", "TO_EVALUATE", "CANCELLED", "ARCHIVED"] })
  status!: ApplicationTermStatus
  @ApiProperty() variableSymbol!: string
  @ApiProperty() amountCzk!: number
}
