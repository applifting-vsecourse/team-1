import { PaymentStatus } from "@/modules/applications/domain/pricing"
import {
  MyApplication,
  MyApplicationTerm,
  PaymentDetails,
} from "@/modules/participants/domain/my-application"
import { ApiProperty } from "@nestjs/swagger"

export class MyApplicationTermDto {
  @ApiProperty()
  termId!: string

  @ApiProperty({ example: "1. týden" })
  name!: string

  @ApiProperty({ example: "2027-07-04", description: "ISO date." })
  startsOn!: string

  @ApiProperty({ example: "2027-07-10", description: "ISO date." })
  endsOn!: string

  @ApiProperty({
    enum: ["CONFIRMED", "WAITLISTED", "CANCELLED"],
    description: "WAITLISTED is shown to the participant as waitlisted, without a place in line.",
  })
  status!: "CONFIRMED" | "WAITLISTED" | "CANCELLED"

  @ApiProperty({ example: 4500, description: "Price frozen at evaluation, whole CZK." })
  priceCzk!: number

  static fromDomain(term: MyApplicationTerm): MyApplicationTermDto {
    return Object.assign(new MyApplicationTermDto(), term)
  }
}

export class PaymentDetailsDto {
  @ApiProperty({ example: "2900123456/2010" })
  bankAccount!: string

  @ApiProperty({ example: "0048" })
  variableSymbol!: string

  static fromDomain(details: PaymentDetails): PaymentDetailsDto {
    return Object.assign(new PaymentDetailsDto(), details)
  }
}

export class MyApplicationResponseDto {
  @ApiProperty()
  id!: string

  @ApiProperty({ example: "Letní kemp 2027" })
  eventName!: string

  @ApiProperty({ example: "Jana" })
  firstName!: string

  @ApiProperty({ example: "Nováková" })
  lastName!: string

  @ApiProperty({
    example: "LKL-0048",
    description: "Reference for people: initials of the event and the number.",
  })
  code!: string

  @ApiProperty({
    example: "0048",
    description: "Application number, four digits: the variable symbol of the payment.",
  })
  variableSymbol!: string

  @ApiProperty({ type: [MyApplicationTermDto] })
  terms!: MyApplicationTermDto[]

  @ApiProperty({ example: 9400, description: "Sum of the confirmed terms, whole CZK." })
  amountDueCzk!: number

  @ApiProperty({ example: 2000 })
  amountPaidCzk!: number

  @ApiProperty({ example: 7400, description: "Due − paid; negative means an overpayment." })
  amountOwedCzk!: number

  @ApiProperty({
    type: PaymentDetailsDto,
    nullable: true,
    description: "Null when every term is waitlisted: nothing to pay yet.",
  })
  paymentDetails!: PaymentDetailsDto | null

  @ApiProperty({
    enum: ["NOTHING_DUE", "UNPAID", "PARTIALLY_PAID", "PAID", "OVERPAID"],
    description: "NOTHING_DUE while no term is confirmed.",
  })
  paymentStatus!: PaymentStatus

  static fromDomain(application: MyApplication): MyApplicationResponseDto {
    return Object.assign(new MyApplicationResponseDto(), {
      ...application,
      terms: application.terms.map(MyApplicationTermDto.fromDomain),
      paymentDetails: application.paymentDetails
        ? PaymentDetailsDto.fromDomain(application.paymentDetails)
        : null,
    })
  }
}
