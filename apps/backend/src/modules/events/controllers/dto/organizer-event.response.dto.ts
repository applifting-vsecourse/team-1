import { EvaluationMode } from "@/modules/applications/domain/evaluation-mode"
import { MissingForApplications } from "@/modules/applications/domain/public-event"
import { EventTermSummary, OrganizerEvent } from "@/modules/events/domain/organizer-event"
import { ApiProperty } from "@nestjs/swagger"

export class EventTermSummaryDto {
  @ApiProperty()
  id!: string

  @ApiProperty({ example: "Letní turnus 1", nullable: true, type: String })
  name!: string | null

  @ApiProperty({ example: "2027-07-12" })
  startsOn!: string

  @ApiProperty({ example: "2027-07-18" })
  endsOn!: string

  @ApiProperty({ enum: ["GENDERED", "SHARED"] })
  roomMode!: "GENDERED" | "SHARED"

  @ApiProperty()
  roomCount!: number

  @ApiProperty({ description: "All beds of the term's own rooms." })
  capacity!: number

  @ApiProperty()
  confirmedCount!: number

  static fromDomain(term: EventTermSummary): EventTermSummaryDto {
    return { ...term }
  }
}

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

  @ApiProperty({ type: String, nullable: true })
  contactEmail!: string | null

  @ApiProperty({ type: String, nullable: true })
  contactPhone!: string | null

  @ApiProperty({ description: "Listed in the public catalog; off by default (US-122)." })
  publishedInCatalog!: boolean

  @ApiProperty({
    type: String,
    nullable: true,
    description: "File name of the page photo; `null` without one.",
  })
  photoFileName!: string | null

  @ApiProperty({ description: "Token of the application link `/apply/<publicToken>`." })
  publicToken!: string

  @ApiProperty()
  createdAt!: string

  @ApiProperty()
  termCount!: number

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

  @ApiProperty({ enum: ["AUTOMATIC", "MANUAL"], description: "How applications are evaluated." })
  evaluationMode!: EvaluationMode

  @ApiProperty({ type: String, nullable: true, example: "2027-07-01" })
  cancellationStartsOn!: string | null

  @ApiProperty({
    description: "Applications are open, so the evaluation mode can no longer change.",
  })
  evaluationModeLocked!: boolean

  @ApiProperty({
    description:
      "At least one application exists, so the event cannot be deleted (the server still checks on delete).",
  })
  hasApplications!: boolean

  @ApiProperty({ description: "The application link works; otherwise the public page is a 404." })
  applicationsOpen!: boolean

  @ApiProperty({
    enum: ["TERM", "ROOM"],
    isArray: true,
    description: "What is still missing before the application link works.",
  })
  missing!: MissingForApplications[]

  @ApiProperty({
    type: [EventTermSummaryDto],
    description: "Terms that are still offered, in chronological order.",
  })
  terms!: EventTermSummaryDto[]

  static fromDomain(event: OrganizerEvent): OrganizerEventResponseDto {
    return {
      id: event.id,
      organizationId: event.organizationId,
      organizationName: event.organizationName,
      name: event.name,
      description: event.description,
      location: event.location,
      contactEmail: event.contactEmail,
      contactPhone: event.contactPhone,
      publishedInCatalog: event.publishedInCatalog,
      photoFileName: event.photoFileName,
      publicToken: event.publicToken,
      createdAt: event.createdAt.toISOString(),
      termCount: event.termCount,
      startsOn: event.startsOn,
      endsOn: event.endsOn,
      applicationsOpen: event.applicationsOpen,
      missing: event.missing,
      evaluationMode: event.evaluationMode,
      cancellationStartsOn: event.cancellationStartsOn,
      evaluationModeLocked: event.evaluationModeLocked,
      hasApplications: event.applicationCount > 0,
      terms: event.terms.map((term) => EventTermSummaryDto.fromDomain(term)),
    }
  }
}
