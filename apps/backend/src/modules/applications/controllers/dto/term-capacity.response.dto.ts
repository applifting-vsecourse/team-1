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
}

class CapacityTermDetailsDto {
  @ApiProperty()
  termId!: string
  @ApiProperty({ type: GenderCapacityDto })
  capacity!: GenderCapacityDto
  @ApiProperty({ type: GenderCapacityDto })
  freePlaces!: GenderCapacityDto
  @ApiProperty()
  name!: string
  @ApiProperty({ example: "2027-07-04" })
  startsOn!: string
  @ApiProperty({ example: "2027-07-10" })
  endsOn!: string
}

export class EventCapacityResponseDto {
  @ApiProperty({ enum: ["GENDERED", "SHARED"] })
  roomMode!: "GENDERED" | "SHARED"
  @ApiProperty()
  eventName!: string
  @ApiProperty({ type: [CapacityRoomDto] })
  rooms!: CapacityRoomDto[]
  @ApiProperty({ type: [CapacityTermDetailsDto] })
  terms!: CapacityTermDetailsDto[]

  static fromDomain(event: EventCapacityDetails): EventCapacityResponseDto {
    return {
      eventName: event.eventName,
      roomMode: event.roomMode,
      rooms: event.rooms.map((room) => ({ ...room })),
      terms: event.terms.map((term) => ({ ...term })),
    }
  }
}

export class TermCapacityResponseDto {
  @ApiProperty()
  termId!: string

  @ApiProperty({ type: GenderCapacityDto })
  capacity!: GenderCapacityDto

  @ApiProperty({ type: GenderCapacityDto, description: "Can be negative when overbooked." })
  freePlaces!: GenderCapacityDto

  static fromDomain(term: TermCapacity): TermCapacityResponseDto {
    return {
      termId: term.termId,
      capacity: { ...term.capacity },
      freePlaces: { ...term.freePlaces },
    }
  }
}
