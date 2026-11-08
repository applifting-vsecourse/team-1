import { ApplicationHistorySource, buildApplicationHistory } from "./application-history"

const day = (iso: string) => new Date(`${iso}T10:00:00Z`)

const source: ApplicationHistorySource = {
  applicantEmail: "jana@example.com",
  createdAt: day("2026-11-03"),
  statusChanges: [
    {
      id: "c1",
      termId: "t1",
      termName: null,
      startsOn: new Date("2027-07-12"),
      endsOn: new Date("2027-07-19"),
      fromStatus: "TO_EVALUATE",
      toStatus: "CONFIRMED",
      changedByName: null,
      changedAt: day("2026-11-03"),
    },
  ],
  paymentRows: [
    {
      receiptId: "r1",
      correctsReceiptId: null,
      amountCzk: 1000,
      recordedByName: "Jakub Kafka",
      createdAt: day("2026-11-04"),
      cancelledAt: null,
    },
    {
      receiptId: "r1",
      correctsReceiptId: null,
      amountCzk: 1000,
      recordedByName: "Jakub Kafka",
      createdAt: day("2026-11-04"),
      cancelledAt: null,
    },
    {
      receiptId: "r2",
      correctsReceiptId: "r0",
      amountCzk: -500,
      recordedByName: "Jakub Kafka",
      createdAt: day("2026-11-05"),
      cancelledAt: day("2026-11-06"),
    },
  ],
}

describe("buildApplicationHistory", () => {
  it("lists creation, status changes and receipts, newest first", () => {
    const history = buildApplicationHistory(source)
    expect(history.map((entry) => entry.kind)).toEqual([
      "PAYMENT",
      "PAYMENT",
      "STATUS_CHANGE",
      "APPLICATION_CREATED",
    ])
  })

  it("makes one entry of a receipt split over terms, with the total", () => {
    const payments = buildApplicationHistory(source).filter((entry) => entry.kind === "PAYMENT")
    expect(payments).toHaveLength(2)
    const split = payments.find((entry) => entry.id === "payment-r1")
    expect(split).toMatchObject({ amountCzk: 2000, author: "Jakub Kafka", isCancelled: false })
  })

  it("marks a refund, a correction and a cancelled receipt", () => {
    const refund = buildApplicationHistory(source).find((entry) => entry.id === "payment-r2")
    expect(refund).toMatchObject({ amountCzk: -500, isCorrection: true, isCancelled: true })
  })

  it("has no author for a change made by the system and the applicant for the creation", () => {
    const history = buildApplicationHistory(source)
    expect(history.find((entry) => entry.kind === "STATUS_CHANGE")?.author).toBeNull()
    expect(history.find((entry) => entry.kind === "APPLICATION_CREATED")?.author).toBe(
      "jana@example.com",
    )
  })
})
