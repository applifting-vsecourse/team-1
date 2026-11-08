import { cancellationPaymentImpact, participantChangeAllowed } from "./participant-term-change"

describe("participant change approval boundary (Prague calendar day)", () => {
  const beforeMidnight = new Date("2027-06-30T21:59:59Z")
  const midnight = new Date("2027-06-30T22:00:00Z")
  const start = new Date("2027-07-01T00:00:00Z")

  it("allows immediate changes with no date", () => {
    expect(participantChangeAllowed(null, midnight)).toBe(true)
  })

  it("allows changes through the preceding Prague day", () => {
    expect(participantChangeAllowed(start, beforeMidnight)).toBe(true)
  })

  it("requires approval from midnight in Prague on the start date", () => {
    expect(participantChangeAllowed(start, midnight)).toBe(false)
  })
})

describe("cancellation payment impact", () => {
  it("keeps the payment on its old term as an overpayment", () => {
    expect(
      cancellationPaymentImpact([{ amountCzk: 4_900 }], { status: "CONFIRMED", priceCzk: 4900 }),
    ).toEqual({
      paidCzk: 4_900,
      owedBeforeCancellationCzk: 0,
      owedAfterCancellationCzk: 0,
      overpaymentAfterCancellationCzk: 4_900,
    })
  })

  it("accounts for recorded refunds", () => {
    expect(
      cancellationPaymentImpact([{ amountCzk: 4_900 }, { amountCzk: -2_000 }], {
        status: "CONFIRMED",
        priceCzk: 4900,
      }),
    ).toEqual({
      paidCzk: 2_900,
      owedBeforeCancellationCzk: 2_000,
      owedAfterCancellationCzk: 0,
      overpaymentAfterCancellationCzk: 2_900,
    })
  })

  it("removes an unpaid confirmed debt", () => {
    expect(cancellationPaymentImpact([], { status: "CONFIRMED", priceCzk: 4900 })).toEqual({
      paidCzk: 0,
      owedBeforeCancellationCzk: 4900,
      owedAfterCancellationCzk: 0,
      overpaymentAfterCancellationCzk: 0,
    })
  })

  it.each(["TO_EVALUATE", "WAITLISTED"] as const)("has no debt to remove for %s", (status) => {
    expect(cancellationPaymentImpact([], { status, priceCzk: 4900 })).toMatchObject({
      owedBeforeCancellationCzk: 0,
      owedAfterCancellationCzk: 0,
    })
  })
})
