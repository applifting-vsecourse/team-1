import { SubstituteProposal } from "@/modules/applications/services/substitutes.service"
import { ApiProperty } from "@nestjs/swagger"

class ProposedSubstituteDto {
  @ApiProperty() applicationId!: string
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty({ enum: ["FEMALE", "MALE"] }) gender!: "FEMALE" | "MALE"
  @ApiProperty({ description: "Price of the term, whole CZK" }) priceCzk!: number
}

/** A free bed of a term and the first substitute it is proposed to (US-31). */
export class SubstituteProposalDto {
  @ApiProperty() termId!: string
  @ApiProperty({ nullable: true, type: String }) termName!: string | null
  @ApiProperty({ example: "2027-07-12" }) startsOn!: string
  @ApiProperty({ example: "2027-07-18" }) endsOn!: string
  @ApiProperty({
    enum: ["FEMALE", "MALE", "SHARED"],
    description: "Bed group: a gender in gendered rooms, or the one common pool",
  })
  group!: "FEMALE" | "MALE" | "SHARED"
  @ApiProperty({ description: "Free beds of the group; in shared rooms the common pool" })
  freeBeds!: number
  @ApiProperty({ type: ProposedSubstituteDto }) substitute!: ProposedSubstituteDto

  static fromDomain(proposal: SubstituteProposal): SubstituteProposalDto {
    return {
      termId: proposal.termId,
      termName: proposal.termName,
      startsOn: proposal.startsOn.toISOString().slice(0, 10),
      endsOn: proposal.endsOn.toISOString().slice(0, 10),
      group: proposal.group,
      freeBeds: proposal.freeBeds,
      substitute: { ...proposal.substitute },
    }
  }
}
