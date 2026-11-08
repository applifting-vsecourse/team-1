import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import { CurrentTermState } from "@/modules/applications/domain/organizer-term-change"
import { computeTermOwed } from "@/modules/applications/domain/pricing"

/**
 * Withdrawal (odhláška) of a participant entered by an organizer (US-32). The write reuses the
 * transaction of the term change (US-33); the preview shown before it uses `previewWithdrawal`,
 * so the organizer sees what will be saved.
 */

/** Why a withdrawal cannot be made: nothing chosen, or a chosen term is not an active one. */
export type WithdrawalRejection = "NOTHING_SELECTED" | "TERM_NOT_ACTIVE"

/** The terms to withdraw from must be terms the application is in now (not cancelled). */
export function rejectWithdrawal(
  activeTermIds: readonly string[],
  withdrawnIds: readonly string[],
): WithdrawalRejection | null {
  if (withdrawnIds.length === 0) return "NOTHING_SELECTED"
  const active = new Set(activeTermIds)
  return withdrawnIds.every((id) => active.has(id)) ? null : "TERM_NOT_ACTIVE"
}

export type WithdrawalTermImpact = {
  termId: string
  status: ApplicationTermStatus
  isWithdrawn: boolean
  /** Only a confirmed term has a debt, so only there the money matters (waitlist: no impact). */
  hasFinancialImpact: boolean
  paidCzk: number
  /** Debt of the term after the withdrawal: a withdrawn term owes nothing. */
  debtCzk: number
  /** Overpayment of the term after the withdrawal; payments are not moved (D-088). */
  overpaymentCzk: number
}

export type WithdrawalImpact = {
  terms: WithdrawalTermImpact[]
  /** Overpayment over all the terms; no refund is created automatically (US-47). */
  overpaymentCzk: number
}

/**
 * What the withdrawal does to the money, per term: a withdrawn term is cancelled, so it has no
 * debt and everything paid in it is an overpayment; the other terms stay as they are.
 */
export function previewWithdrawal(input: {
  current: CurrentTermState[]
  withdrawnIds: readonly string[]
}): WithdrawalImpact {
  const withdrawn = new Set(input.withdrawnIds)
  const terms = input.current.map((term): WithdrawalTermImpact => {
    const isWithdrawn = withdrawn.has(term.termId)
    const owed = computeTermOwed(
      { status: isWithdrawn ? "CANCELLED" : term.status, priceCzk: term.priceCzk },
      [{ amountCzk: term.paidCzk }],
    )
    return {
      termId: term.termId,
      status: term.status,
      isWithdrawn,
      hasFinancialImpact: term.status === "CONFIRMED",
      paidCzk: term.paidCzk,
      debtCzk: Math.max(0, owed),
      overpaymentCzk: Math.max(0, -owed),
    }
  })
  return {
    terms,
    overpaymentCzk: terms.reduce((sum, term) => sum + term.overpaymentCzk, 0),
  }
}
