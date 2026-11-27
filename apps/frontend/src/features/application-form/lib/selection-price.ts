import type { PublicTerm } from "@/features/application-form/api/publicEvent"

export type ParticipantPrice = {
  termCount: number
  priceCzk: number
}

/**
 * Preliminary price of one participant: the sum of the prices the API sent for
 * the ticked terms. This is only a display sum for the form; the server owns the
 * real computation (`computeSelectionPrice` in `modules/applications/domain/pricing.ts`).
 */
export function priceOfSelection(terms: PublicTerm[], termIds: string[]): ParticipantPrice {
  const selected = terms.filter((term) => termIds.includes(term.id))
  return {
    termCount: selected.length,
    priceCzk: selected.reduce((sum, term) => sum + term.priceCzk, 0),
  }
}

export function totalPrice(prices: ParticipantPrice[]): number {
  return prices.reduce((sum, price) => sum + price.priceCzk, 0)
}

/** One line of the price panel: a ticked term of one participant, or the participant without any. */
export type PriceRow = {
  key: string
  /** `null` while the participant has no term ticked ("No term"). */
  term: PublicTerm | null
  /** Already resolved: the typed name or "Participant N". */
  participant: string
  priceCzk: number
}

/** The price panel lists every ticked term of every participant, in the order of the event's terms. */
export function priceRows(
  terms: PublicTerm[],
  participants: { label: string; termIds: string[] }[],
): PriceRow[] {
  return participants.flatMap(({ label, termIds }, index): PriceRow[] => {
    const selected = terms.filter((term) => termIds.includes(term.id))
    if (selected.length === 0) {
      return [{ key: `${index}`, term: null, participant: label, priceCzk: 0 }]
    }
    return selected.map((term) => ({
      key: `${index}-${term.id}`,
      term,
      participant: label,
      priceCzk: term.priceCzk,
    }))
  })
}
