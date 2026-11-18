import { TermAssignments } from "@/modules/events/domain/room-assignment"
import { RoomProposal } from "@/modules/events/domain/room-proposal"
import { Gender } from "@/shared/domain/gender"
import { ApiProperty } from "@nestjs/swagger"

const STATUSES = ["TO_EVALUATE", "CONFIRMED", "WAITLISTED", "CANCELLED"]

class RoomWishDto {
  @ApiProperty({ description: "Name as the participant wrote it (free text)" }) name!: string
  @ApiProperty({ description: "The named person is in the same room of the same term" })
  fulfilled!: boolean
}
class ParticipantDto {
  @ApiProperty({ description: "Application in the term; the id the assignment endpoints take" })
  applicationTermId!: string
  @ApiProperty() applicationId!: string
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty({ example: 2011, description: "Birth year only, not the full date" })
  birthYear!: number
  @ApiProperty({ enum: ["FEMALE", "MALE"] }) gender!: Gender
  @ApiProperty() individualAccommodation!: boolean
  @ApiProperty({ enum: STATUSES }) status!: string
  @ApiProperty({ type: [RoomWishDto], description: "Roommate wishes, at most 3 (US-146)" })
  wishes!: RoomWishDto[]
}
class OtherTermRoomDto {
  @ApiProperty() id!: string
  @ApiProperty() name!: string
  @ApiProperty({ enum: ["FEMALE", "MALE"], nullable: true }) gender!: Gender | null
  @ApiProperty({ description: "Beds left, extra beds included" }) freeBeds!: number
}
class OtherTermDto {
  @ApiProperty() termId!: string
  @ApiProperty({ nullable: true, type: String }) name!: string | null
  @ApiProperty({ example: "2027-07-04" }) startsOn!: string
  @ApiProperty({ example: "2027-07-10" }) endsOn!: string
  @ApiProperty({ type: [OtherTermRoomDto] }) rooms!: OtherTermRoomDto[]
}
class UnassignedDto extends ParticipantDto {
  @ApiProperty({
    type: [OtherTermDto],
    description: "Other terms the same room can be assigned in at once",
  })
  alsoInTerms!: OtherTermDto[]
}
class AssignmentRoomDto {
  @ApiProperty() id!: string
  @ApiProperty() name!: string
  @ApiProperty() capacity!: number
  @ApiProperty() extraBeds!: number
  @ApiProperty({ description: "All beds: capacity plus extra beds" }) beds!: number
  @ApiProperty({ enum: ["FEMALE", "MALE"], nullable: true }) gender!: Gender | null
  @ApiProperty({ type: [ParticipantDto] }) participants!: ParticipantDto[]
}

const WARNING_KINDS = ["OVERCROWDED", "MIXED_GENDER", "CONFIRMED_WITHOUT_BED"]

class RoomWarningDto {
  @ApiProperty({ enum: WARNING_KINDS }) kind!: string
  @ApiProperty({ nullable: true, type: String, description: "Room of the first two kinds" })
  roomId!: string | null
  @ApiProperty({
    nullable: true,
    type: String,
    description: "Application of CONFIRMED_WITHOUT_BED",
  })
  applicationTermId!: string | null
  @ApiProperty({ description: "Knowingly confirmed by an organizer: muted, not counted" })
  acknowledged!: boolean
  @ApiProperty({ nullable: true, type: String }) note!: string | null
  @ApiProperty({ nullable: true, type: Date }) acknowledgedAt!: Date | null
  @ApiProperty({ nullable: true, type: String }) acknowledgedBy!: string | null
}
class RoomWarningsSummaryDto {
  @ApiProperty({ description: "Broken room rules nobody confirmed" }) violations!: number
  @ApiProperty({ description: "Confirmed warnings of any kind" }) acknowledged!: number
  @ApiProperty({ description: "Confirmed applications without a bed" }) confirmedWithoutBed!: number
}

export class RoomAssignmentsResponseDto {
  @ApiProperty() eventId!: string
  @ApiProperty() termId!: string
  @ApiProperty({ type: [AssignmentRoomDto] }) rooms!: AssignmentRoomDto[]
  @ApiProperty({
    type: [UnassignedDto],
    description: "Confirmed and to-evaluate applications of the term without a room",
  })
  unassigned!: UnassignedDto[]
  @ApiProperty({ type: [RoomWarningDto], description: "Rule warnings; they block nothing" })
  warnings!: RoomWarningDto[]
  @ApiProperty({ type: RoomWarningsSummaryDto }) summary!: RoomWarningsSummaryDto

  static fromDomain(assignments: TermAssignments): RoomAssignmentsResponseDto {
    return Object.assign(new RoomAssignmentsResponseDto(), assignments)
  }
}

class ProposalPlacementDto {
  @ApiProperty() applicationTermId!: string
  @ApiProperty() roomId!: string
}
class ProposalUnplacedDto {
  @ApiProperty() applicationTermId!: string
  @ApiProperty({ enum: ["INDIVIDUAL_ACCOMMODATION", "NO_FREE_BED"] }) reason!: string
}
class ProposalWishDto {
  @ApiProperty({ description: "Who wished it; somebody the proposal gave a bed" })
  applicationTermId!: string
  @ApiProperty() name!: string
  @ApiProperty({ type: [String], description: "People of the term the name stands for" })
  matches!: string[]
  @ApiProperty({ description: "The named person sleeps in the same room in the proposal" })
  fulfilled!: boolean
}

export class RoomProposalResponseDto {
  @ApiProperty({ type: [ProposalPlacementDto], description: "Proposed rooms; nothing is saved" })
  placements!: ProposalPlacementDto[]
  @ApiProperty({
    type: [ProposalUnplacedDto],
    description: "Confirmed participants without a room who got none in the proposal",
  })
  unplaced!: ProposalUnplacedDto[]
  @ApiProperty({ type: [ProposalWishDto], description: "Wishes of the people given a bed" })
  wishes!: ProposalWishDto[]

  static fromDomain(proposal: RoomProposal): RoomProposalResponseDto {
    return Object.assign(new RoomProposalResponseDto(), proposal)
  }
}
