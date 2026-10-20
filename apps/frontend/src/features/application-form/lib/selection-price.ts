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
