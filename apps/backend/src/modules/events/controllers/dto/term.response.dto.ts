import { EventTerm } from "@/modules/events/domain/event-term"
import { ApiProperty } from "@nestjs/swagger"

export class TermResponseDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  eventId!: string

  @ApiProperty({ example: "Letní turnus 1" })
  name!: string

  @ApiProperty({ example: "2027-07-12" })
  startsOn!: string

  @ApiProperty({ example: "2027-07-18" })
  endsOn!: string

  @ApiProperty()
  priceCzk!: number

  @ApiProperty({ enum: ["GENDERED", "SHARED"] })
  roomMode!: "GENDERED" | "SHARED"

  @ApiProperty()
  roomCount!: number

  @ApiProperty({ description: "All beds of the term's own rooms." })
  capacity!: number

  @ApiProperty()
  confirmedCount!: number

  @ApiProperty()
  waitlistedCount!: number

  @ApiProperty({ type: String, nullable: true, description: "Set once the term is cancelled." })
  cancelledAt!: string | null

  @ApiProperty({ type: String, nullable: true })
  cancelReason!: string | null

  static fromDomain(term: EventTerm): TermResponseDto {
    return {
      id: term.id,
      eventId: term.eventId,
      name: term.name,
      startsOn: term.startsOn,
      endsOn: term.endsOn,
      priceCzk: term.priceCzk,
      roomMode: term.roomMode,
      roomCount: term.roomCount,
      capacity: term.capacity,
      confirmedCount: term.confirmedCount,
      waitlistedCount: term.waitlistedCount,
      cancelledAt: term.cancelledAt?.toISOString() ?? null,
      cancelReason: term.cancelReason,
    }
  }
}
