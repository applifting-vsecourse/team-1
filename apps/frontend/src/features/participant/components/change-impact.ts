/**
 * #551: what the dialogs "Odhlásit přihlášku", "Požádat o odhlášení" and "Změnit termín" tell the
 * applicant about the payment. One sentence per term (`termImpact`) and one block of warnings for
 * the whole action (`impactWarning`). Pure functions so every state has a unit test; the dialog only
 * renders the result.
 */
export type ChangeMode = "change" | "cancel"

/** The part of a term the message depends on. */
export type ImpactTerm = {
  status: "TO_EVALUATE" | "CONFIRMED" | "WAITLISTED" | "CANCELLED" | "ARCHIVED"
  paidCzk: number
  owedBeforeCancellationCzk: number
}

export type SentenceKey =
  | "change.state.unpaidCancel"
  | "change.state.unpaidChange"
  | "change.state.paid"
  | "change.state.partialCancel"
  | "change.state.partialChange"
  | "change.state.waitlisted"
  | "change.state.toEvaluate"

export type WarningKey =
  | "change.warning.afterConfirm"
  | "change.warning.bedChange"
  | "change.warning.bedChangeTitle"
  | "change.warning.bedCancel"
  | "change.warning.bedCancelTitle"
  | "change.warning.noTransfer"
  | "change.warning.noRefundChange"
  | "change.warning.noRefundCancel"
  | "change.warning.noRefundRequest"
  | "change.approvalTitle"
  | "change.bedAfterApproval"

export type TermImpact = { key: SentenceKey; params?: { paid: number; total: number } }

/** One sentence about the payment of a term that leaves the application. */
export function termImpact(mode: ChangeMode, term: ImpactTerm): TermImpact {
  if (term.paidCzk <= 0) {
    if (term.status === "WAITLISTED") return { key: "change.state.waitlisted" }
    if (term.status === "TO_EVALUATE") return { key: "change.state.toEvaluate" }
    return { key: mode === "change" ? "change.state.unpaidChange" : "change.state.unpaidCancel" }
  }
  const total = term.paidCzk + Math.max(term.owedBeforeCancellationCzk, 0)
  if (term.owedBeforeCancellationCzk > 0) {
    return {
      key: mode === "change" ? "change.state.partialChange" : "change.state.partialCancel",
      params: { paid: term.paidCzk, total },
    }
  }
  return { key: "change.state.paid", params: { paid: term.paidCzk, total } }
}

export type ImpactWarning = {
  /** Heading of the block; with a single line it is the line itself and `lines` is empty. */
  title: WarningKey
  lines: WarningKey[]
}

/**
 * All warnings of one action in one block (DESIGN.md, Copy, rule 5). Without a payment there is at
 * most the bed; without a bed and a payment there is nothing to warn about.
 */
export function impactWarning({
  mode,
  isImmediate,
  hasRemovedBed,
  hasPaid,
}: {
  mode: ChangeMode
  isImmediate: boolean
  hasRemovedBed: boolean
  hasPaid: boolean
}): ImpactWarning | null {
  if (!isImmediate) {
    const lines: WarningKey[] = []
    if (hasRemovedBed) lines.push("change.bedAfterApproval")
    if (hasPaid && mode === "change") lines.push("change.warning.noTransfer")
    if (hasPaid) lines.push("change.warning.noRefundRequest")
    return { title: "change.approvalTitle", lines }
  }
  if (!hasPaid) {
    if (!hasRemovedBed) return null
    return {
      title: mode === "change" ? "change.warning.bedChangeTitle" : "change.warning.bedCancelTitle",
      lines: [],
    }
  }
  const lines: WarningKey[] = []
  if (hasRemovedBed) {
    lines.push(mode === "change" ? "change.warning.bedChange" : "change.warning.bedCancel")
  }
  if (mode === "change") lines.push("change.warning.noTransfer", "change.warning.noRefundChange")
  else lines.push("change.warning.noRefundCancel")
  return { title: "change.warning.afterConfirm", lines }
}
