import { TermAssignments } from "@/modules/events/domain/room-assignment"
import { Gender } from "@/shared/domain/gender"
import { ApiProperty } from "@nestjs/swagger"

const STATUSES = ["TO_EVALUATE", "CONFIRMED", "WAITLISTED", "CANCELLED"]

class ParticipantDto {
  @ApiProperty({ description: "Application in the term; the id the assignment endpoints take" })
  applicationTermId!: string
  @ApiProperty() applicationId!: string
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty({ enum: ["FEMALE", "MALE"] }) gender!: Gender
  @ApiProperty() individualAccommodation!: boolean
  @ApiProperty({ enum: STATUSES }) status!: string
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
