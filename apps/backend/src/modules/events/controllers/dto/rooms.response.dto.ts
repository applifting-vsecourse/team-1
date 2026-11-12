import { RoomMode, TermRooms } from "@/modules/events/domain/rooms"
import { Gender } from "@/shared/domain/gender"
import { ApiProperty } from "@nestjs/swagger"

class RoomResponseDto {
  @ApiProperty() id!: string
  @ApiProperty() name!: string
  @ApiProperty() capacity!: number
  @ApiProperty({ description: "Extra beds (přistýlky), each one more bed" }) extraBeds!: number
  @ApiProperty({ enum: ["FEMALE", "MALE"], nullable: true }) gender!: Gender | null
}
class RoomCapacityDto {
  @ApiProperty() FEMALE!: number
  @ApiProperty() MALE!: number
  @ApiProperty() total!: number
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
  @ApiProperty({ type: [RoomResponseDto] }) rooms!: RoomResponseDto[]
  @ApiProperty({ type: RoomCapacityDto }) capacity!: RoomCapacityDto

  static fromDomain(term: TermRooms): RoomsResponseDto {
    return Object.assign(new RoomsResponseDto(), term)
  }
}
