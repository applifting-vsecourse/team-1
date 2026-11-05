import { computePaymentCorrectionPreview } from "./payment-correction-preview"

type PreviewTerm = Parameters<typeof computePaymentCorrectionPreview>[0]["terms"][number]
const term = (id: string, payments: { receiptId: string; amountCzk: number }[]): PreviewTerm => ({
  termId: id,
  applicationTermId: id,
  termNumber: Number(id),
  startsOn: new Date(`2027-07-${id.padStart(2, "0")}`),
  status: "CONFIRMED" as const,
  priceCzk: 1000,
  payments,
})

describe("computePaymentCorrectionPreview", () => {
  it("restores the original term debt and credits the selected term", () => {
    expect(
      computePaymentCorrectionPreview({
        terms: [term("1", [{ receiptId: "original", amountCzk: 1000 }]), term("2", [])],
        receiptId: "original",
        termId: "2",
        amountCzk: 500,
        isRefund: false,
      }),
    ).toEqual({
      ok: true,
      preview: {
        amountOwedCzk: 1500,
        terms: [
          { termId: "1", owedCzk: 1000, changeCzk: 1000 },
          { termId: "2", owedCzk: 500, changeCzk: -500 },
        ],
      },
    })
  })

  it("reallocates a summary receipt including an overpayment offset", () => {
    expect(
      computePaymentCorrectionPreview({
        terms: [
          term("1", [{ receiptId: "other", amountCzk: 1500 }]),
          term("2", [{ receiptId: "original", amountCzk: 500 }]),
        ],
        receiptId: "original",
        amountCzk: 300,
        isRefund: false,
      }),
    ).toEqual({
      ok: true,
      preview: {
        amountOwedCzk: 200,
        terms: [
          { termId: "1", owedCzk: 0, changeCzk: 500 },
          { termId: "2", owedCzk: 200, changeCzk: -300 },
        ],
      },
    })
  })

  it("previews a refund against the overpayment after cancelling its original", () => {
    const terms = [
      term("1", [
        { receiptId: "other", amountCzk: 1500 },
        { receiptId: "original", amountCzk: -400 },
      ]),
    ]
    expect(
      computePaymentCorrectionPreview({
        terms,
        receiptId: "original",
        termId: "1",
        amountCzk: 200,
        isRefund: true,
      }),
    ).toEqual({
      ok: true,
      preview: { amountOwedCzk: -300, terms: [{ termId: "1", owedCzk: -300, changeCzk: -200 }] },
    })
    expect(
      computePaymentCorrectionPreview({
        terms,
        receiptId: "original",
        termId: "1",
        amountCzk: 600,
        isRefund: true,
      }),
    ).toEqual({ ok: false, errorCode: "REFUND_EXCEEDS_OVERPAYMENT" })
  })

  it("rejects an unknown term and a refund without a term", () => {
    const input = { terms: [term("1", [])], receiptId: "original", amountCzk: 100 }
    expect(
      computePaymentCorrectionPreview({ ...input, termId: "foreign", isRefund: false }),
    ).toEqual({ ok: false, errorCode: "PAYMENT_TERM_NOT_IN_APPLICATION" })
    expect(computePaymentCorrectionPreview({ ...input, isRefund: true })).toEqual({
      ok: false,
      errorCode: "REFUND_TERM_REQUIRED",
    })
  })
})
