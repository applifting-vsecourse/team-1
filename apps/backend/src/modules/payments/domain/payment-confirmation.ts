type TermBalance = { id: string; owedCzk: number }

/**
 * E-mail no. 8 (US-117): the confirmed terms whose debt a payment closed, i.e. owed more than
 * nothing before and nothing (or less, an overpayment) after. A payment that only reduces the
 * debt, or lands on a term that already is paid, closes nothing and sends nothing.
 */
export function planPaymentConfirmations<T extends TermBalance>(
  before: TermBalance[],
  after: T[],
): T[] {
  return after.filter(
    (term) =>
      term.owedCzk <= 0 &&
      before.some((candidate) => candidate.id === term.id && candidate.owedCzk > 0),
  )
}
