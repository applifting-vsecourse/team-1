import { EventRooms, RoomMode } from "@/modules/events/domain/rooms"
import { Gender } from "@/shared/domain/gender"
import { ApiProperty } from "@nestjs/swagger"

class RoomResponseDto {
  @ApiProperty() id!: string
  @ApiProperty() name!: string
  @ApiProperty() capacity!: number
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
  @ApiProperty({ enum: ["GENDERED", "SHARED"] }) roomMode!: RoomMode
  @ApiProperty() termCount!: number
  @ApiProperty({ type: [RoomResponseDto] }) rooms!: RoomResponseDto[]
  @ApiProperty({ type: RoomCapacityDto }) capacity!: RoomCapacityDto

  static fromDomain(event: EventRooms): RoomsResponseDto {
    return Object.assign(new RoomsResponseDto(), event)
  }
}
