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

  @ApiProperty({ enum: ["CONFIRMED", "WAITLISTED"] })
  status!: "CONFIRMED" | "WAITLISTED"

  @ApiProperty({ example: 4500, description: "Price frozen at evaluation, whole CZK." })
  priceCzk!: number

  @ApiProperty({
    type: Number,
    nullable: true,
    description: "Place in the waiting list; null when confirmed.",
  })
  waitlistPosition!: number | null

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

  @ApiProperty({ example: "0048", description: "Application number, four digits." })
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
