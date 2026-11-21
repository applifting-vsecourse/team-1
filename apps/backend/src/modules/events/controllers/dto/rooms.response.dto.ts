import { RoomMode, TermRooms } from "@/modules/events/domain/rooms"
import { Gender } from "@/shared/domain/gender"
import { ApiProperty } from "@nestjs/swagger"

class OccupiedByDto {
  @ApiProperty() FEMALE!: number
  @ApiProperty() MALE!: number
}
class RoomResponseDto {
  @ApiProperty() id!: string
  @ApiProperty() name!: string
  @ApiProperty() capacity!: number
  @ApiProperty({ description: "Extra beds (přistýlky), each one more bed" }) extraBeds!: number
  @ApiProperty({ description: "All beds of the room: capacity plus extra beds" }) beds!: number
  @ApiProperty({ enum: ["FEMALE", "MALE"], nullable: true }) gender!: Gender | null
  @ApiProperty({
    description: "Individual (mixed, family) room, counted into the capacity by occupancy (US-145)",
  })
  individual!: boolean
  @ApiProperty({
    type: () => OccupiedByDto,
    description: "Confirmed people in an individual room by gender: what it adds to the capacity",
  })
  occupiedBy!: OccupiedByDto
}
class RoomCapacityDto {
  @ApiProperty() FEMALE!: number
  @ApiProperty() MALE!: number
  @ApiProperty() total!: number
  @ApiProperty({
    description:
      "All beds in individual rooms; only the occupied ones are in the capacity above (US-145)",
  })
  individualBeds!: number
}
export class RoomsResponseDto {
  @ApiProperty() eventId!: string
  @ApiProperty() eventName!: string
  @ApiProperty() organizationName!: string
  @ApiProperty() termId!: string
  @ApiProperty({ nullable: true, type: String }) termName!: string | null
  @ApiProperty({ example: "2027-07-04" }) startsOn!: string
  @ApiProperty({ example: "2027-07-10" }) endsOn!: string
  @ApiProperty({ enum: ["GENDERED", "SHARED"] }) roomMode!: RoomMode
  @ApiProperty({ description: "Confirmed participants see their room (US-144)" })
  roomsPublished!: boolean
  @ApiProperty({ type: [RoomResponseDto] }) rooms!: RoomResponseDto[]
  @ApiProperty({ type: RoomCapacityDto }) capacity!: RoomCapacityDto

  static fromDomain(term: TermRooms): RoomsResponseDto {
    // The raw assignments stay out of the response; only the counts by gender (`occupiedBy`) go.
    const rooms = term.rooms.map(
      ({ id, name, capacity, extraBeds, beds, gender, individual, occupiedBy }) => ({
        id,
        name,
        capacity,
        extraBeds,
        beds,
        gender,
        individual,
        occupiedBy,
      }),
    )
    return Object.assign(new RoomsResponseDto(), { ...term, rooms })
  }
}
