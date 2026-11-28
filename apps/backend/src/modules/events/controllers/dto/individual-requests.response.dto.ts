import { IndividualRequest } from "@/modules/events/domain/individual-request"
import { ApiProperty } from "@nestjs/swagger"

class IndividualRequestDto {
  @ApiProperty({ description: "Application in the term" }) applicationTermId!: string
  @ApiProperty({ description: "Opens the application detail" }) applicationId!: string
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty({ enum: ["TO_EVALUATE", "CONFIRMED", "WAITLISTED"] }) status!: string
  @ApiProperty({
    nullable: true,
    type: String,
    description: "What the applicant wrote; null when they only asked for individual accommodation",
  })
  request!: string | null
}

export class IndividualRequestsResponseDto {
  @ApiProperty({ type: [IndividualRequestDto] }) requests!: IndividualRequestDto[]

  static fromDomain(requests: IndividualRequest[]): IndividualRequestsResponseDto {
    return { requests }
  }
}
