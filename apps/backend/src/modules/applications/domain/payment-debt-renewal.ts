type TermBalance = { id: string; owedCzk: number }

/** Only a previously settled confirmed term entering debt starts a new payment period. */
export function planPaymentDebtRenewal<T extends TermBalance>(
  before: TermBalance[],
  after: T[],
): { renewedTermIds: string[]; indebtedTerms: T[] } | null {
  const renewedTermIds = before
    .filter(
      (term) =>
        term.owedCzk <= 0 &&
        after.some((candidate) => candidate.id === term.id && candidate.owedCzk > 0),
    )
    .map((term) => term.id)
  return renewedTermIds.length
    ? { renewedTermIds, indebtedTerms: after.filter((term) => term.owedCzk > 0) }
    : null
}
