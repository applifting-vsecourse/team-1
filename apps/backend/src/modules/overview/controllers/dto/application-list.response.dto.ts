import { applicationList } from "@/modules/overview/domain/application-list"
import { ApiProperty } from "@nestjs/swagger"

class ApplicationListTermDto {
  @ApiProperty() id!: string
  @ApiProperty() name!: string
  @ApiProperty() startsOn!: string
  @ApiProperty() endsOn!: string
  @ApiProperty({ enum: ["CONFIRMED", "WAITLISTED", "CANCELLED"] }) status!: string
  @ApiProperty() priceCzk!: number
}

export class ApplicationListResponseDto {
  @ApiProperty() id!: string
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty() birthDate!: string
  @ApiProperty({ enum: ["FEMALE", "MALE"] }) gender!: string
  @ApiProperty() email!: string
  @ApiProperty() submittedAt!: string
  @ApiProperty() amountDueCzk!: number
  @ApiProperty() amountPaidCzk!: number
  @ApiProperty() amountOwedCzk!: number
  @ApiProperty({ enum: ["NOTHING_DUE", "UNPAID", "PARTIALLY_PAID", "PAID", "OVERPAID"] })
  paymentStatus!: string
  @ApiProperty({ type: [ApplicationListTermDto] }) terms!: ApplicationListTermDto[]

  static fromDomain(row: ReturnType<typeof applicationList>[number]): ApplicationListResponseDto {
    return {
      ...row,
      birthDate: row.birthDate.toISOString().slice(0, 10),
      submittedAt: row.submittedAt.toISOString(),
      terms: row.terms.map((term) => ({
        ...term,
        startsOn: term.startsOn.toISOString().slice(0, 10),
        endsOn: term.endsOn.toISOString().slice(0, 10),
      })),
    }
  }
}
