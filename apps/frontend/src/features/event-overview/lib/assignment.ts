/**
 * The term to select beforehand: the only one of the application, or the one the variable symbol
 * of the transaction points to (application number × 1000 + term number) — only when the whole
 * application number of the symbol is this application's. Else nothing — the organizer chooses.
 */
export function preselectedTermId(
  application: { number: number; terms: { termId: string; termNumber: number }[] },
  variableSymbol: string | null,
): string | null {
  const { number, terms } = application
  if (terms.length === 1) return terms[0]!.termId
  if (variableSymbol === null || !/^\d{1,10}$/.test(variableSymbol)) return null
  const value = Number(variableSymbol)
  if (Math.floor(value / 1000) !== number) return null
  return terms.find((term) => term.termNumber === value % 1000)?.termId ?? null
}
