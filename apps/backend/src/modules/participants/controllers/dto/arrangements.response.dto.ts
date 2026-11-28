import { Arrangements } from "@/modules/participants/repositories/arrangements.repository"
import { toPragueWallTime } from "@/shared/domain/prague-wall-time"
import { ApiProperty } from "@nestjs/swagger"

class RoomWishesArrangementDto {
  @ApiProperty({ type: [String] }) names!: string[]
  @ApiProperty() noRoomWishes!: boolean
  @ApiProperty({
    description: "„No wishes“ can still be confirmed: no names, rooms not published.",
  })
  canDecline!: boolean
}

class StayArrangementDto {
  @ApiProperty({ type: String, nullable: true, example: "2027-07-13T10:30" })
  lateArrival!: string | null
  @ApiProperty({ type: String, nullable: true, example: "2027-07-18T16:00" })
  earlyDeparture!: string | null
}

class TermArrangementDto {
  @ApiProperty() termId!: string
  @ApiProperty({ type: String, nullable: true }) name!: string | null
  @ApiProperty({ example: "2027-07-12" }) startsOn!: string
  @ApiProperty({ example: "2027-07-19" }) endsOn!: string
  @ApiProperty() status!: string
  @ApiProperty({ description: "The term is not over: wishes and stay can still be changed." })
  editable!: boolean
  @ApiProperty({
    required: false,
    type: RoomWishesArrangementDto,
    description: "Only for a confirmed term of a participant without individual accommodation",
  })
  roomWishes?: RoomWishesArrangementDto
  @ApiProperty({
    required: false,
    type: StayArrangementDto,
    description: "Absent for a cancelled or archived term",
  })
  stay?: StayArrangementDto
}

export class ArrangementsResponseDto {
  @ApiProperty() applicationId!: string
  @ApiProperty() eventName!: string
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty({ type: [TermArrangementDto] }) terms!: TermArrangementDto[]

  static fromDomain(domain: Arrangements): ArrangementsResponseDto {
    return {
      ...domain,
      terms: domain.terms.map(({ stay, startsOn, endsOn, ...term }) => ({
        ...term,
        startsOn: startsOn.toISOString().slice(0, 10),
        endsOn: endsOn.toISOString().slice(0, 10),
        ...(stay
          ? {
              stay: {
                lateArrival: stay.lateArrivalAt ? toPragueWallTime(stay.lateArrivalAt) : null,
                earlyDeparture: stay.earlyDepartureAt
                  ? toPragueWallTime(stay.earlyDepartureAt)
                  : null,
              },
            }
          : {}),
      })),
    }
  }
}
