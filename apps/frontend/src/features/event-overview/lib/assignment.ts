/** What an assigned bank payment does to a term: paid before → after, and what is left or over. */
export function afterAssignment(input: { paidCzk: number; owedCzk: number; amountCzk: number }): {
  fromCzk: number
  toCzk: number
  restCzk: number
  overCzk: number
} {
  const rest = input.owedCzk - input.amountCzk
  return {
    fromCzk: input.paidCzk,
    toCzk: input.paidCzk + input.amountCzk,
    restCzk: Math.max(0, rest),
    overCzk: Math.max(0, -rest),
  }
}

/**
 * The term to select beforehand: the only one of the application, or the one the variable symbol
 * of the transaction points to (application number × 1000 + term number). Else nothing — the
 * organizer chooses.
 */
export function preselectedTermId(
  terms: { termId: string; termNumber: number }[],
  variableSymbol: string | null,
): string | null {
  if (terms.length === 1) return terms[0]!.termId
  if (variableSymbol === null || !/^\d{1,10}$/.test(variableSymbol)) return null
  const termNumber = Number(variableSymbol) % 1000
  return terms.find((term) => term.termNumber === termNumber)?.termId ?? null
}
