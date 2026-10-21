import { MissingForApplications } from "@/modules/applications/domain/public-event"
import { OrganizerEvent } from "@/modules/events/domain/organizer-event"
import { ApiProperty } from "@nestjs/swagger"

export class OrganizerEventResponseDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  organizationId!: string

  @ApiProperty({ example: "Letní kemp z. s." })
  organizationName!: string

  @ApiProperty({ example: "Letní kemp 2027" })
  name!: string

  @ApiProperty({ type: String, nullable: true })
  description!: string | null

  @ApiProperty({ type: String, nullable: true })
  location!: string | null

  @ApiProperty({ description: "Token of the application link `/apply/<publicToken>`." })
  publicToken!: string

  @ApiProperty()
  createdAt!: string

  @ApiProperty()
  termCount!: number

  @ApiProperty()
  roomCount!: number

  @ApiProperty({
    type: String,
    nullable: true,
    example: "2027-07-04",
    description: "Start of the first term, ISO date.",
  })
  startsOn!: string | null

  @ApiProperty({
    type: String,
    nullable: true,
    example: "2027-08-14",
    description: "End of the last term, ISO date.",
  })
  endsOn!: string | null

  @ApiProperty({ description: "The application link works; otherwise the public page is a 404." })
  applicationsOpen!: boolean

  @ApiProperty({
    enum: ["TERM", "ROOM"],
    isArray: true,
    description: "What is still missing before the application link works.",
  })
  missing!: MissingForApplications[]

  static fromDomain(event: OrganizerEvent): OrganizerEventResponseDto {
    return {
      id: event.id,
      organizationId: event.organizationId,
      organizationName: event.organizationName,
      name: event.name,
      description: event.description,
      location: event.location,
      publicToken: event.publicToken,
      createdAt: event.createdAt.toISOString(),
      termCount: event.termCount,
      roomCount: event.roomCount,
      startsOn: event.startsOn,
      endsOn: event.endsOn,
      applicationsOpen: event.applicationsOpen,
      missing: event.missing,
    }
  }
}
