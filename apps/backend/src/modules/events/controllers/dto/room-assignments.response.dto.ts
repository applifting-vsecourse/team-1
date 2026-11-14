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

export class RoomAssignmentsResponseDto {
  @ApiProperty() eventId!: string
  @ApiProperty() termId!: string
  @ApiProperty({ type: [AssignmentRoomDto] }) rooms!: AssignmentRoomDto[]
  @ApiProperty({
    type: [UnassignedDto],
    description: "Confirmed and to-evaluate applications of the term without a room",
  })
  unassigned!: UnassignedDto[]

  static fromDomain(assignments: TermAssignments): RoomAssignmentsResponseDto {
    return Object.assign(new RoomAssignmentsResponseDto(), assignments)
  }
}
