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
