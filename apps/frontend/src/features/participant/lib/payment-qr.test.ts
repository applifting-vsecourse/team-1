import { describe, expect, it } from "vitest"

import {
  czechIban,
  paymentSpayd,
  spaydMessage,
  summaryPaymentSpayd,
} from "@/features/participant/lib/payment-qr"

describe("summary payment QR", () => {
  it("converts a Czech account with a prefix to IBAN and includes the summary amount and symbol", () => {
    expect(czechIban("19-2000145399/0800")).toBe("CZ6508000000192000145399")
    expect(summaryPaymentSpayd("19-2000145399/0800", 1200, "90270012")).toBe(
      "SPD*1.0*ACC:CZ6508000000192000145399*AM:1200.00*CC:CZK*X-VS:90270012",
    )
  })

  it("does not create an unusable QR for invalid or settled payment details", () => {
    expect(summaryPaymentSpayd("invalid", 1200, "90270012")).toBeNull()
    expect(summaryPaymentSpayd("123456789/0800", 0, "90270012")).toBeNull()
    expect(summaryPaymentSpayd("123456789/0800", 1200, "wrong")).toBeNull()
  })
})

describe("term payment QR (US-41)", () => {
  const base = { bankAccount: "19-2000145399/0800", amountCzk: 2500, variableSymbol: "48001" }

  it("carries the debt, the variable symbol of the term and the event name without diacritics", () => {
    expect(paymentSpayd({ ...base, message: "Letní kemp Lipno 2027" })).toBe(
      "SPD*1.0*ACC:CZ6508000000192000145399*AM:2500.00*CC:CZK*X-VS:48001*MSG:Letni kemp Lipno 2027",
    )
  })

  it("keeps the message within SPAYD limits", () => {
    expect(spaydMessage("Škola *žije* – ďábelský výlet")).toBe("Skola zije dabelsky vylet")
    expect(spaydMessage("x".repeat(80))).toHaveLength(60)
    expect(paymentSpayd({ ...base, message: "***" })).toBe(
      "SPD*1.0*ACC:CZ6508000000192000145399*AM:2500.00*CC:CZK*X-VS:48001",
    )
  })

  it("makes no QR when the term has no debt", () => {
    expect(paymentSpayd({ ...base, amountCzk: 0, message: "Kemp" })).toBeNull()
    expect(paymentSpayd({ ...base, amountCzk: -500, message: "Kemp" })).toBeNull()
  })
})
