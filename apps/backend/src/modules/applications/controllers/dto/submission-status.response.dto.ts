import { PaymentStatus } from "@/modules/applications/domain/pricing"
import {
  ApplicationPayment,
  SubmissionStatus,
  SubmittedApplicationStatus,
} from "@/modules/applications/domain/submission-status"
import { ApiProperty } from "@nestjs/swagger"

export class SubmissionTermDto {
  @ApiProperty()
  termId!: string

  @ApiProperty({ example: "1. týden" })
  name!: string

  @ApiProperty({ example: "2027-07-04", description: "ISO date." })
  startsOn!: string

  @ApiProperty({ example: "2027-07-10", description: "ISO date." })
  endsOn!: string

  @ApiProperty({
    enum: ["CONFIRMED", "WAITLISTED"],
    description: "WAITLISTED is shown to the participant as waitlisted, without a place in line.",
  })
  status!: "CONFIRMED" | "WAITLISTED"

  @ApiProperty({ example: 4500, description: "Price frozen at evaluation, whole CZK." })
  priceCzk!: number
}

export class ApplicationPaymentDto {
  @ApiProperty({ example: "2900123456/2010" })
  bankAccount!: string

  @ApiProperty({ example: "0048", description: "Number of this application, four digits." })
  variableSymbol!: string

  @ApiProperty({ example: 6900, description: "Still to pay for this application, whole CZK." })
  amountCzk!: number
}

export class SubmittedApplicationDto {
  @ApiProperty({ example: "Jana" })
  firstName!: string

  @ApiProperty({ example: "Nováková" })
  lastName!: string

  @ApiProperty({ example: "LK-0048", description: "Reference for people." })
  code!: string

  @ApiProperty({ example: "0048" })
  variableSymbol!: string

  @ApiProperty({ type: [SubmissionTermDto] })
  terms!: SubmissionTermDto[]

  @ApiProperty({
    enum: ["NOTHING_DUE", "UNPAID", "PARTIALLY_PAID", "PAID", "OVERPAID"],
    description: "NOTHING_DUE while no term is confirmed.",
  })
  paymentStatus!: PaymentStatus

  @ApiProperty({
    type: ApplicationPaymentDto,
    nullable: true,
    description: "Null when every term of this application is waitlisted: nothing to pay yet.",
  })
  payment!: ApplicationPaymentDto | null

  static fromDomain(application: SubmittedApplicationStatus): SubmittedApplicationDto {
    return Object.assign(new SubmittedApplicationDto(), application, {
      payment: application.payment ? toPaymentDto(application.payment) : null,
    })
  }
}

const toPaymentDto = (payment: ApplicationPayment): ApplicationPaymentDto =>
  Object.assign(new ApplicationPaymentDto(), payment)

export class SubmissionStatusResponseDto {
  @ApiProperty({ example: "Letní kemp 2027" })
  eventName!: string

  @ApiProperty({ example: "jana@example.com" })
  email!: string

  @ApiProperty({ description: "The account was created by this submission (no password yet)." })
  isNewAccount!: boolean

  @ApiProperty({
    type: [SubmittedApplicationDto],
    description: "One per participant, in form order.",
  })
  applications!: SubmittedApplicationDto[]

  static fromDomain(status: SubmissionStatus): SubmissionStatusResponseDto {
    return Object.assign(new SubmissionStatusResponseDto(), {
      ...status,
      applications: status.applications.map(SubmittedApplicationDto.fromDomain),
    })
  }
}
