import {
  organizerChangeStatuses,
  previewTermChange,
} from "@/modules/applications/domain/organizer-term-change"

const free = { FEMALE: 2, MALE: 2 }
const full = { FEMALE: 0, MALE: 0 }

describe("previewTermChange", () => {
  const current = [{ termId: "a", status: "CONFIRMED" as const, priceCzk: 4900, paidCzk: 4900 }]

  it("keeps the payment of the removed term as an overpayment and owes the price of the new one", () => {
    const impact = previewTermChange({
      gender: "MALE",
      current,
      selectedIds: ["b"],
      added: [{ termId: "b", priceCzk: 5600, freePlaces: free, genderCapacity: 50 }],
    })
    expect(impact).toMatchObject({
      newPriceCzk: 5600,
      amountToPayCzk: 5600,
      overpaymentCzk: 4900,
      removed: [{ termId: "a", paidCzk: 4900, overpaymentCzk: 4900 }],
      added: [{ termId: "b", fits: true, genderCapacity: 50, genderFree: 2 }],
    })
  })

  it("leaves a paid term that stays untouched", () => {
    const impact = previewTermChange({
      gender: "MALE",
      current,
      selectedIds: ["a", "b"],
      added: [{ termId: "b", priceCzk: 5600, freePlaces: free, genderCapacity: 50 }],
    })
    expect(impact).toMatchObject({
      newPriceCzk: 10500,
      amountToPayCzk: 5600,
      overpaymentCzk: 0,
      removed: [],
    })
  })

  it("takes the payments of a term put back into the selection into account", () => {
    const impact = previewTermChange({
      gender: "MALE",
      current: [{ termId: "b", status: "CONFIRMED", priceCzk: 5600, paidCzk: 0 }],
      selectedIds: ["a"],
      added: [{ termId: "a", priceCzk: 4900, paidCzk: 4900, freePlaces: free, genderCapacity: 50 }],
    })
    expect(impact).toMatchObject({ amountToPayCzk: 0, overpaymentCzk: 0 })
    expect(impact.added[0].paidCzk).toBe(4900)
  })

  it("does not count a removed term without payments as an overpayment", () => {
    const impact = previewTermChange({
      gender: "MALE",
      current: [{ termId: "a", status: "CONFIRMED", priceCzk: 4900, paidCzk: 0 }],
      selectedIds: [],
      added: [],
    })
    expect(impact).toMatchObject({ newPriceCzk: 0, amountToPayCzk: 0, overpaymentCzk: 0 })
  })

  it("reports a full term as not fitting", () => {
    const impact = previewTermChange({
      gender: "MALE",
      current: [],
      selectedIds: ["b"],
      added: [{ termId: "b", priceCzk: 5600, freePlaces: full, genderCapacity: 50 }],
    })
    expect(impact.added[0].fits).toBe(false)
  })
})

describe("organizerChangeStatuses", () => {
  const added = [{ termId: "b", priceCzk: 5600, freePlaces: full }]

  it("confirms the added terms when a bed is free", () => {
    expect(organizerChangeStatuses("FEMALE", [{ ...added[0], freePlaces: free }], false)).toEqual({
      ok: true,
      terms: [{ termId: "b", status: "CONFIRMED", priceCzk: 5600 }],
    })
  })

  it("refuses a full term without the conscious confirmation", () => {
    expect(organizerChangeStatuses("FEMALE", added, false)).toEqual({ ok: false })
  })

  it("confirms a full term over its capacity once the organizer confirms", () => {
    expect(organizerChangeStatuses("FEMALE", added, true)).toMatchObject({ ok: true })
  })
})
