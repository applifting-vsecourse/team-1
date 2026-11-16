/** Czech bank account number to IBAN for the ACC field of a QR Platba. */
export function czechIban(bankAccount: string): string | null {
  const normalized = bankAccount.replace(/\s/g, "").toUpperCase()
  if (/^CZ\d{22}$/.test(normalized)) return normalized

  const match = /^(?:(\d{1,6})-)?(\d{1,10})\/(\d{4})$/.exec(normalized)
  if (!match) return null
  const prefix = match[1] ?? ""
  const account = match[2]!
  const bank = match[3]!
  const bban = bank + prefix.padStart(6, "0") + account.padStart(10, "0")
  // ISO 13616: move CZ00 to the end, replace C/Z with 12/35 and calculate mod 97.
  const digits = `${bban}123500`
  let remainder = 0
  for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97
  return `CZ${String(98 - remainder).padStart(2, "0")}${bban}`
}

/** SPAYD allows 60 characters of message in the limited set of upper-case ASCII; `*` separates fields. */
const MAX_MESSAGE_LENGTH = 60

/** The event name as a SPAYD message: no diacritics, no `*`, at most 60 characters. */
export function spaydMessage(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/\*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH)
    .trim()
}

type PaymentSpaydInput = {
  bankAccount: string
  amountCzk: number
  variableSymbol: string
  /** Shown to the payer and the recipient, e.g. the event name. */
  message?: string
}

/**
 * Standard Czech QR Platba (SPAYD); the code is generated locally in the browser.
 * `null` when there is nothing to pay or the account or symbol is unusable.
 */
export function paymentSpayd({
  bankAccount,
  amountCzk,
  variableSymbol,
  message,
}: PaymentSpaydInput): string | null {
  const iban = czechIban(bankAccount)
  if (
    !iban ||
    !Number.isSafeInteger(amountCzk) ||
    amountCzk <= 0 ||
    !/^\d{1,10}$/.test(variableSymbol)
  ) {
    return null
  }
  const text = message ? spaydMessage(message) : ""
  return `SPD*1.0*ACC:${iban}*AM:${amountCzk}.00*CC:CZK*X-VS:${variableSymbol}${text ? `*MSG:${text}` : ""}`
}

export function summaryPaymentSpayd(
  bankAccount: string,
  amountCzk: number,
  variableSymbol: string,
  message?: string,
): string | null {
  return paymentSpayd({ bankAccount, amountCzk, variableSymbol, message })
}
