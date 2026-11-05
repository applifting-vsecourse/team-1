import { SubstitutePerson, SubstituteRecord } from "@/modules/applications/domain/term-status"
import { ApiProperty } from "@nestjs/swagger"

class SubstitutePersonDto {
  @ApiProperty() applicationId!: string
  @ApiProperty() name!: string
  @ApiProperty({
    enum: ["CONFIRMED", "WAITLISTED", "CANCELLED", "TO_EVALUATE"],
    description: "Status in the term now, not when the record was written",
  })
  status!: "CONFIRMED" | "WAITLISTED" | "CANCELLED" | "TO_EVALUATE"
}

/** System record of one confirmation from the waitlist (US-105). Read-only. */
export class SubstituteRecordDto {
  @ApiProperty() id!: string
  @ApiProperty() termId!: string
  @ApiProperty({
    enum: ["FEMALE", "MALE", "SHARED"],
    description: "Queue of the confirmed one: their gender, or the one common queue",
  })
  group!: "FEMALE" | "MALE" | "SHARED"
  @ApiProperty({ type: SubstitutePersonDto }) confirmed!: SubstitutePersonDto
  @ApiProperty({ type: [SubstitutePersonDto], description: "Ahead of the confirmed one, in order" })
  skipped!: SubstitutePersonDto[]
  @ApiProperty({ nullable: true, type: String, description: "Null: the system acted" })
  changedByName!: string | null
  @ApiProperty() changedAt!: string

  static fromDomain(record: SubstituteRecord): SubstituteRecordDto {
    const person = ({ applicationId, name, status }: SubstitutePerson) => ({
      applicationId,
      name,
      status,
    })
    return {
      id: record.id,
      termId: record.termId,
      group: record.group,
      confirmed: person(record.confirmed),
      skipped: record.skipped.map(person),
      changedByName: record.changedByName,
      changedAt: record.changedAt.toISOString(),
    }
  }
}
