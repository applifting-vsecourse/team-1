import { MyApplicationResponseDto } from "@/modules/participants/controllers/dto/my-application.response.dto"
import { SubmissionPayment, SubmissionStatus } from "@/modules/participants/domain/my-application"
import { ApiProperty } from "@nestjs/swagger"

export class SubmissionPartDto {
  @ApiProperty({ example: "Jana" })
  firstName!: string

  @ApiProperty({ example: 6900 })
  amountCzk!: number
}

export class SubmissionPaymentDto {
  @ApiProperty({ example: 14300, description: "Whole CZK, for the whole submission." })
  amountCzk!: number

  @ApiProperty({ example: "2900123456/2010" })
  bankAccount!: string

  @ApiProperty({
    example: "0048",
    description: "Number of the first application with a confirmed term.",
  })
  variableSymbol!: string

  @ApiProperty({ type: [SubmissionPartDto] })
  parts!: SubmissionPartDto[]

  static fromDomain(payment: SubmissionPayment): SubmissionPaymentDto {
    return Object.assign(new SubmissionPaymentDto(), payment)
  }
}

export class SubmissionStatusResponseDto {
  @ApiProperty({ example: "LKL-0048", description: "Reference of the first application." })
  code!: string

  @ApiProperty({ example: "Letní kemp 2027" })
  eventName!: string

  @ApiProperty({ example: "jana@example.com" })
  email!: string

  @ApiProperty({ description: "The account was created by this submission (no password yet)." })
  isNewAccount!: boolean

  @ApiProperty({
    type: [MyApplicationResponseDto],
    description: "One per participant; WAITLISTED is shown as waiting for confirmation.",
  })
  applications!: MyApplicationResponseDto[]

  @ApiProperty({
    type: SubmissionPaymentDto,
    nullable: true,
    description: "Null when every term is waitlisted: nothing to pay yet.",
  })
  payment!: SubmissionPaymentDto | null

  static fromDomain(status: SubmissionStatus): SubmissionStatusResponseDto {
    return Object.assign(new SubmissionStatusResponseDto(), {
      ...status,
      applications: status.applications.map(MyApplicationResponseDto.fromDomain),
      payment: status.payment ? SubmissionPaymentDto.fromDomain(status.payment) : null,
    })
  }
}
