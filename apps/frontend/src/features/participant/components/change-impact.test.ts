import { describe, expect, it } from "vitest"

import {
  impactWarning,
  termImpact,
  type ImpactTerm,
} from "@/features/participant/components/change-impact"

const confirmed = (paidCzk: number, owedBeforeCancellationCzk: number): ImpactTerm => ({
  status: "CONFIRMED",
  paidCzk,
  owedBeforeCancellationCzk,
})

describe("termImpact", () => {
  it("says nothing is paid for an unpaid confirmed term", () => {
    expect(termImpact("cancel", confirmed(0, 4900)).key).toBe("change.state.unpaidCancel")
    expect(termImpact("change", confirmed(0, 4900)).key).toBe("change.state.unpaidChange")
  })

  it("names the paid amount of a fully paid term", () => {
    expect(termImpact("cancel", confirmed(4900, 0))).toEqual({
      key: "change.state.paid",
      params: { paid: 4900, total: 4900 },
    })
  })

  it("names the paid part and the total of a partly paid term", () => {
    expect(termImpact("cancel", confirmed(2000, 2900))).toEqual({
      key: "change.state.partialCancel",
      params: { paid: 2000, total: 4900 },
    })
    expect(termImpact("change", confirmed(2000, 2900)).key).toBe("change.state.partialChange")
  })

  it("says payments do not apply to a waitlisted participant", () => {
    expect(
      termImpact("cancel", { status: "WAITLISTED", paidCzk: 0, owedBeforeCancellationCzk: 0 }).key,
    ).toBe("change.state.waitlisted")
  })

  it("says there is no bed or payment yet for a term awaiting evaluation", () => {
    expect(
      termImpact("change", { status: "TO_EVALUATE", paidCzk: 0, owedBeforeCancellationCzk: 0 }).key,
    ).toBe("change.state.toEvaluate")
  })
})

describe("impactWarning", () => {
  it("puts every warning of a paid immediate change into one block", () => {
    expect(
      impactWarning({ mode: "change", isImmediate: true, hasRemovedBed: true, hasPaid: true }),
    ).toEqual({
      title: "change.warning.afterConfirm",
      lines: [
        "change.warning.bedChange",
        "change.warning.noTransfer",
        "change.warning.noRefundChange",
      ],
    })
  })

  it("keeps only the bed line for an unpaid immediate change or cancellation", () => {
    expect(
      impactWarning({ mode: "change", isImmediate: true, hasRemovedBed: true, hasPaid: false }),
    ).toEqual({ title: "change.warning.bedChangeTitle", lines: [] })
    expect(
      impactWarning({ mode: "cancel", isImmediate: true, hasRemovedBed: true, hasPaid: false }),
    ).toEqual({ title: "change.warning.bedCancelTitle", lines: [] })
  })

  it("warns about the bed and the refund when a paid term is cancelled immediately", () => {
    expect(
      impactWarning({ mode: "cancel", isImmediate: true, hasRemovedBed: true, hasPaid: true }),
    ).toEqual({
      title: "change.warning.afterConfirm",
      lines: ["change.warning.bedCancel", "change.warning.noRefundCancel"],
    })
  })

  it("has no warning for a waitlisted participant who pays nothing", () => {
    expect(
      impactWarning({ mode: "cancel", isImmediate: true, hasRemovedBed: false, hasPaid: false }),
    ).toBeNull()
  })

  it("says the organizer decides when the request needs approval", () => {
    expect(
      impactWarning({ mode: "cancel", isImmediate: false, hasRemovedBed: true, hasPaid: true }),
    ).toEqual({
      title: "change.approvalTitle",
      lines: ["change.bedAfterApproval", "change.warning.noRefundRequest"],
    })
    expect(
      impactWarning({ mode: "cancel", isImmediate: false, hasRemovedBed: false, hasPaid: false }),
    ).toEqual({ title: "change.approvalTitle", lines: [] })
  })
})
