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

export type ApplicationHistorySource = {
  /** E-mail of the applicant who submitted the application. */
  applicantEmail: string
  createdAt: Date
  statusChanges: HistoryStatusChange[]
  paymentRows: HistoryPaymentRow[]
}

type EntryBase = {
  id: string
  at: Date
  /** Who made the change; null when the system did. */
  author: string | null
}

export type HistoryEntry =
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

/**
 * The history of changes of an application (US-53): its creation, every status change in a term
 * and every recorded payment or refund, newest first. A receipt split over several terms is one
 * entry. Computed here and nowhere else; the screen only formats the entries.
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

  // At the same instant the creation is the oldest thing that happened, so it goes last.
  const age = (entry: HistoryEntry) => (entry.kind === "APPLICATION_CREATED" ? 0 : 1)
  return entries.sort(
    (a, b) => b.at.getTime() - a.at.getTime() || age(b) - age(a) || a.id.localeCompare(b.id),
  )
}
