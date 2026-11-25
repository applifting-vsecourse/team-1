import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"

/** A stored status change of the application in one term, with the term it belongs to. */
export type HistoryStatusChange = {
  id: string
  termId: string
  termName: string | null
  startsOn: Date
  endsOn: Date
  fromStatus: ApplicationTermStatus
  toStatus: ApplicationTermStatus
  /** Name of the organizer; null when the system changed the status. */
  changedByName: string | null
  changedAt: Date
}

/** One stored payment row (one term of one receipt). */
export type HistoryPaymentRow = {
  receiptId: string
  correctsReceiptId: string | null
  amountCzk: number
  recordedByName: string
  createdAt: Date
  cancelledAt: Date | null
}

/** The details of an application an edit can change (D-141). */
export const EDITABLE_FIELDS = [
  "firstName",
  "lastName",
  "pronouns",
  "birthDate",
  "phone",
  "individualAccommodation",
  "accommodationRequest",
] as const
export type EditableField = (typeof EDITABLE_FIELDS)[number]

/** One stored edit of the details: who saved it, which fields and their values before and after. */
export type HistoryEdit = {
  id: string
  authorName: string
  changedFields: string[]
  before: Partial<Record<EditableField, string | boolean | null>>
  after: Partial<Record<EditableField, string | boolean | null>>
  changedAt: Date
}

/**
 * A changed field with its value before and after; a flag is `"true"` / `"false"`.
 * Accommodation notes and pronouns are only marked as changed in the displayed history.
 */
export type HistoryFieldChange =
  | {
      field: Exclude<EditableField, "accommodationRequest" | "pronouns">
      from: string | null
      to: string | null
    }
  | { field: "accommodationRequest" | "pronouns"; from?: undefined; to?: undefined }

export type ApplicationHistorySource = {
  /** E-mail of the applicant who submitted the application. */
  applicantEmail: string
  createdAt: Date
  statusChanges: HistoryStatusChange[]
  paymentRows: HistoryPaymentRow[]
  edits: HistoryEdit[]
}

type EntryBase = {
  id: string
  at: Date
  /** Who made the change; null when the system did. */
  author: string | null
}

export type HistoryEntry =
  | (EntryBase & { kind: "EDIT"; changes: HistoryFieldChange[] })
  | (EntryBase & { kind: "APPLICATION_CREATED" })
  | (EntryBase & {
      kind: "STATUS_CHANGE"
      termName: string | null
      startsOn: Date
      endsOn: Date
      fromStatus: ApplicationTermStatus
      toStatus: ApplicationTermStatus
    })
  | (EntryBase & {
      kind: "PAYMENT"
      /** Total of the receipt over its terms; negative for a refund. */
      amountCzk: number
      isCorrection: boolean
      isCancelled: boolean
    })

const asText = (value: string | boolean | null | undefined): string | null =>
  value === undefined || value === null || value === "" ? null : String(value)

/**
 * The history of changes of an application (US-53): its creation, every status change in a term
 * and every recorded payment or refund, newest first. A receipt split over several terms is one
 * entry, as is every edit of the details with what changed in it. Computed here and nowhere else; the screen only formats the entries.
 */
export function buildApplicationHistory(source: ApplicationHistorySource): HistoryEntry[] {
  const entries: HistoryEntry[] = [
    {
      kind: "APPLICATION_CREATED",
      id: "created",
      at: source.createdAt,
      author: source.applicantEmail,
    },
  ]

  for (const change of source.statusChanges) {
    entries.push({
      kind: "STATUS_CHANGE",
      id: `status-${change.id}`,
      at: change.changedAt,
      author: change.changedByName,
      termName: change.termName,
      startsOn: change.startsOn,
      endsOn: change.endsOn,
      fromStatus: change.fromStatus,
      toStatus: change.toStatus,
    })
  }

  const receipts = new Map<string, HistoryPaymentRow[]>()
  for (const row of source.paymentRows) {
    receipts.set(row.receiptId, [...(receipts.get(row.receiptId) ?? []), row])
  }
  for (const [receiptId, rows] of receipts) {
    const [first] = rows
    entries.push({
      kind: "PAYMENT",
      id: `payment-${receiptId}`,
      at: first.createdAt,
      author: first.recordedByName,
      amountCzk: rows.reduce((sum, row) => sum + row.amountCzk, 0),
      isCorrection: first.correctsReceiptId !== null,
      isCancelled: first.cancelledAt !== null,
    })
  }

  for (const edit of source.edits) {
    entries.push({
      kind: "EDIT",
      id: `edit-${edit.id}`,
      at: edit.changedAt,
      author: edit.authorName,
      changes: EDITABLE_FIELDS.filter((field) => edit.changedFields.includes(field)).map(
        (field): HistoryFieldChange =>
          field === "accommodationRequest" || field === "pronouns"
            ? { field }
            : { field, from: asText(edit.before[field]), to: asText(edit.after[field]) },
      ),
    })
  }

  // At the same instant the creation is the oldest thing that happened, so it goes last.
  const age = (entry: HistoryEntry) => (entry.kind === "APPLICATION_CREATED" ? 0 : 1)
  return entries.sort(
    (a, b) => b.at.getTime() - a.at.getTime() || age(b) - age(a) || a.id.localeCompare(b.id),
  )
}
