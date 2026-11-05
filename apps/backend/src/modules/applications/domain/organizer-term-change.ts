import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import {
  computeTermDue,
  computeTermOwed,
  computeTermPaid,
} from "@/modules/applications/domain/pricing"
import { Gender, GenderCounts } from "@/shared/domain/gender"

/**
 * Change of the terms of an application by an organizer (US-33). The write in
 * `TermStatusRepository` and the preview shown before it both use these functions, so the
 * organizer sees what will be saved.
 */

/** A term the application is in now (not cancelled) with its payments. */
export type CurrentTermState = {
  termId: string
  status: ApplicationTermStatus
  priceCzk: number
  paidCzk: number
}

/** A term to be added, with its situation under the event lock. */
export type AddedTermState = {
  termId: string
  priceCzk: number
  /** Money already paid in the term: only a term reactivated from a cancelled one has some. */
  paidCzk?: number
  freePlaces: GenderCounts
  /** Beds the applicant's gender can use in the term (a shared pool counts all beds). */
  genderCapacity: number
}

export type TermChangeImpact = {
  gender: Gender
  newPriceCzk: number
  /** Sum of the debt of the terms the application will be in (overpaid ones count as zero). */
  amountToPayCzk: number
  /** Overpayment of the terms that stay and of the removed ones; payments are not moved (D-088). */
  overpaymentCzk: number
  added: {
    termId: string
    priceCzk: number
    paidCzk: number
    fits: boolean
    genderCapacity: number
    genderFree: number
  }[]
  removed: { termId: string; paidCzk: number; overpaymentCzk: number }[]
}

/** A term fits when a bed for the applicant's gender is free. */
export function addedTermFits(gender: Gender, freePlaces: GenderCounts): boolean {
  return freePlaces[gender] > 0
}

/**
 * What the change does to the money, per term: kept terms stay as they are, a new term owes its
 * price, a removed term keeps its payments as an overpayment (no automatic refund, D-056).
 */
export function previewTermChange(input: {
  gender: Gender
  current: CurrentTermState[]
  selectedIds: readonly string[]
  added: AddedTermState[]
}): TermChangeImpact {
  const selected = new Set(input.selectedIds)
  const kept = input.current.filter((term) => selected.has(term.termId))
  const removed = input.current.filter((term) => !selected.has(term.termId))

  const keptOwed = kept.map((term) => computeTermOwed(term, [{ amountCzk: term.paidCzk }]))
  const removedRows = removed.map((term) => {
    const paidCzk = computeTermPaid([{ amountCzk: term.paidCzk }])
    // A removed term is cancelled: nothing due, so everything paid is an overpayment.
    const owed = computeTermOwed({ status: "CANCELLED", priceCzk: term.priceCzk }, [
      { amountCzk: paidCzk },
    ])
    return { termId: term.termId, paidCzk, overpaymentCzk: Math.max(0, -owed) }
  })
  const addedOwed = input.added.map((term) => term.priceCzk - (term.paidCzk ?? 0))

  const owedAll = [...keptOwed, ...addedOwed]
  return {
    gender: input.gender,
    newPriceCzk: [
      ...kept.map((term) => computeTermDue(term)),
      ...input.added.map((term) => term.priceCzk),
    ].reduce((sum, price) => sum + price, 0),
    amountToPayCzk: owedAll.reduce((sum, owed) => sum + Math.max(0, owed), 0),
    overpaymentCzk:
      [...keptOwed, ...addedOwed].reduce((sum, owed) => sum + Math.max(0, -owed), 0) +
      removedRows.reduce((sum, row) => sum + row.overpaymentCzk, 0),
    added: input.added.map((term) => ({
      termId: term.termId,
      priceCzk: term.priceCzk,
      paidCzk: term.paidCzk ?? 0,
      fits: addedTermFits(input.gender, term.freePlaces),
      genderCapacity: term.genderCapacity,
      genderFree: term.freePlaces[input.gender],
    })),
    removed: removedRows,
  }
}

/**
 * The organizer's change puts the applicant in the added terms as confirmed with a debt: it is
 * their decision, so neither the evaluation mode nor the free beds decide. Without a free bed it
 * takes the organizer's conscious confirmation (US-28), and no approval by the cancellation
 * start is needed.
 */
export function organizerChangeStatuses(
  gender: Gender,
  added: readonly { termId: string; priceCzk: number; freePlaces: GenderCounts }[],
  isOverCapacityConfirmed: boolean,
):
  { ok: true; terms: { termId: string; status: "CONFIRMED"; priceCzk: number }[] } | { ok: false } {
  if (!isOverCapacityConfirmed && added.some((term) => !addedTermFits(gender, term.freePlaces))) {
    return { ok: false }
  }
  return {
    ok: true,
    terms: added.map((term) => ({
      termId: term.termId,
      status: "CONFIRMED" as const,
      priceCzk: term.priceCzk,
    })),
  }
}
