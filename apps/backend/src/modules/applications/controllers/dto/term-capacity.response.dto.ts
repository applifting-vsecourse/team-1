import { EventCapacityDetails, TermCapacity } from "@/modules/applications/domain/event-capacity"
import { ApiProperty } from "@nestjs/swagger"

export class GenderCapacityDto {
  @ApiProperty({ example: 50 })
  FEMALE!: number

  @ApiProperty({ example: 50 })
  MALE!: number
}

class CapacityRoomDto {
  @ApiProperty()
  id!: string
  @ApiProperty()
  name!: string
  @ApiProperty({ enum: ["FEMALE", "MALE"], nullable: true, type: String })
  gender!: "FEMALE" | "MALE" | null
  @ApiProperty()
  capacity!: number
  @ApiProperty({ description: "Extra beds (přistýlky); each adds one bed to the room's capacity" })
  extraBeds!: number
}

class CapacityTermDetailsDto {
  @ApiProperty()
  termId!: string
  @ApiProperty({ enum: ["GENDERED", "SHARED"] })
  roomMode!: "GENDERED" | "SHARED"
  @ApiProperty({ type: [CapacityRoomDto] })
  rooms!: CapacityRoomDto[]
  @ApiProperty({ type: GenderCapacityDto })
  capacity!: GenderCapacityDto
  @ApiProperty({ type: GenderCapacityDto })
  freePlaces!: GenderCapacityDto
  @ApiProperty({ nullable: true, type: String })
  name!: string | null
  @ApiProperty({ example: "2027-07-04" })
  startsOn!: string
  @ApiProperty({ example: "2027-07-10" })
  endsOn!: string
}

export class EventCapacityResponseDto {
  @ApiProperty()
  eventName!: string
  @ApiProperty({ type: [CapacityTermDetailsDto] })
  terms!: CapacityTermDetailsDto[]

  static fromDomain(event: EventCapacityDetails): EventCapacityResponseDto {
    return {
      eventName: event.eventName,
      terms: event.terms.map((term) => ({
        ...term,
        rooms: term.rooms.map((room) => ({ ...room })),
      })),
    }
  }
}

export class TermCapacityResponseDto {
  @ApiProperty()
  termId!: string

  @ApiProperty({ enum: ["GENDERED", "SHARED"] })
  roomMode!: "GENDERED" | "SHARED"

  @ApiProperty({ type: GenderCapacityDto })
  capacity!: GenderCapacityDto

  @ApiProperty({ type: GenderCapacityDto, description: "Can be negative when overbooked." })
  freePlaces!: GenderCapacityDto

  static fromDomain(term: TermCapacity): TermCapacityResponseDto {
    return {
      termId: term.termId,
      roomMode: term.roomMode,
      capacity: { ...term.capacity },
      freePlaces: { ...term.freePlaces },
    }
  }
}
