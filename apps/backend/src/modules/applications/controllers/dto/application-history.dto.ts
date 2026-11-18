import {
  EDITABLE_FIELDS,
  HistoryEntry,
  HistoryFieldChange,
} from "@/modules/applications/domain/application-history"
import { ApiProperty } from "@nestjs/swagger"

export class HistoryFieldChangeDto {
  @ApiProperty({ enum: EDITABLE_FIELDS }) field!: HistoryFieldChange["field"]
  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
    description: "Null: the field was empty. Not sent for the accommodation note.",
  })
  from?: string | null
  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
    description: "Null: the field is empty now. Not sent for the accommodation note.",
  })
  to?: string | null
}

const STATUSES = ["TO_EVALUATE", "CONFIRMED", "WAITLISTED", "CANCELLED"]

/** One change of an application: when, by whom and what. The fields after `author` depend on `kind`. */
export class HistoryEntryDto {
  @ApiProperty() id!: string
  @ApiProperty({ enum: ["APPLICATION_CREATED", "STATUS_CHANGE", "PAYMENT", "EDIT"] })
  kind!: HistoryEntry["kind"]
  @ApiProperty() at!: string
  @ApiProperty({ nullable: true, type: String, description: "Null: the system made the change" })
  author!: string | null

  @ApiProperty({ nullable: true, type: String, description: "STATUS_CHANGE: optional term name" })
  termName?: string | null
  @ApiProperty({ required: false, description: "STATUS_CHANGE: first day of the term" })
  startsOn?: string
  @ApiProperty({ required: false, description: "STATUS_CHANGE: last day of the term" })
  endsOn?: string
  @ApiProperty({ required: false, enum: STATUSES }) fromStatus?: string
  @ApiProperty({ required: false, enum: STATUSES }) toStatus?: string

  @ApiProperty({
    required: false,
    description: "PAYMENT: total of the receipt in whole CZK; negative for a refund",
  })
  amountCzk?: number
  @ApiProperty({ required: false, description: "PAYMENT: replaces an earlier receipt" })
  isCorrection?: boolean
  @ApiProperty({ required: false, description: "PAYMENT: the receipt was cancelled since" })
  isCancelled?: boolean

  @ApiProperty({
    required: false,
    type: [HistoryFieldChangeDto],
    description: "EDIT: the changed details; a flag is the text true or false",
  })
  changes?: HistoryFieldChangeDto[]

  static fromDomain(entry: HistoryEntry): HistoryEntryDto {
    const base = {
      id: entry.id,
      kind: entry.kind,
      at: entry.at.toISOString(),
      author: entry.author,
    }
    if (entry.kind === "STATUS_CHANGE") {
      return {
        ...base,
        termName: entry.termName,
        startsOn: entry.startsOn.toISOString().slice(0, 10),
        endsOn: entry.endsOn.toISOString().slice(0, 10),
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
      }
    }
    if (entry.kind === "EDIT") return { ...base, changes: entry.changes }
    if (entry.kind === "PAYMENT") {
      return {
        ...base,
        amountCzk: entry.amountCzk,
        isCorrection: entry.isCorrection,
        isCancelled: entry.isCancelled,
      }
    }
    return base
  }
}
