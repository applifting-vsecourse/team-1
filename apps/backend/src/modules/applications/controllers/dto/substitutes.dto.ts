import { GenderCapacityDto } from "@/modules/applications/controllers/dto/term-capacity.response.dto"
import {
  SubstituteConfirmation,
  SubstituteList,
} from "@/modules/applications/services/substitutes.service"
import { ApiProperty } from "@nestjs/swagger"

class SubstituteDto {
  @ApiProperty() applicationId!: string
  @ApiProperty() number!: number
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty({ example: "2011-05-04" }) birthDate!: string
  @ApiProperty({ enum: ["FEMALE", "MALE"] }) gender!: "FEMALE" | "MALE"
  @ApiProperty() email!: string
  @ApiProperty() submittedAt!: string
  @ApiProperty({ description: "Position in the waitlist of the bed group (US-30)" })
  position!: number
  @ApiProperty({ description: "Price of the term, whole CZK" }) priceCzk!: number
}

export class SubstituteListResponseDto {
  @ApiProperty() termId!: string
  @ApiProperty({ enum: ["AUTOMATIC", "MANUAL"] }) evaluationMode!: "AUTOMATIC" | "MANUAL"
  @ApiProperty({ enum: ["GENDERED", "SHARED"] }) roomMode!: "GENDERED" | "SHARED"
  @ApiProperty({
    type: GenderCapacityDto,
    description: "Free beds; in shared rooms both numbers are the one common pool",
  })
  freeBeds!: GenderCapacityDto
  @ApiProperty({ type: [SubstituteDto], description: "In order of receipt" })
  items!: SubstituteDto[]

  static fromDomain(list: SubstituteList): SubstituteListResponseDto {
    return {
      termId: list.termId,
      evaluationMode: list.evaluationMode,
      roomMode: list.roomMode,
      freeBeds: list.freeBeds,
      items: list.items.map((item) => ({
        applicationId: item.applicationId,
        number: item.number,
        firstName: item.firstName,
        lastName: item.lastName,
        birthDate: item.birthDate.toISOString().slice(0, 10),
        gender: item.gender,
        email: item.email,
        submittedAt: item.submittedAt.toISOString(),
        position: item.position,
        priceCzk: item.priceCzk,
      })),
    }
  }
}

export class SubstituteConfirmationResponseDto {
  @ApiProperty() applicationId!: string
  @ApiProperty({ description: "Price of the term, whole CZK; the debt that arises" })
  priceCzk!: number
  @ApiProperty() bankAccount!: string
  @ApiProperty({ example: "2027001" }) variableSymbol!: string

  static fromDomain(result: SubstituteConfirmation): SubstituteConfirmationResponseDto {
    return { ...result }
  }
}
