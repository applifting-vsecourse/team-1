import { describe, expect, it } from "vitest"

import { czechIban, summaryPaymentSpayd } from "@/features/participant/lib/payment-qr"

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
