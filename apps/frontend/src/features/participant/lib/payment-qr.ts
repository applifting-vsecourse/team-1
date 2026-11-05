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

/** Standard Czech QR Platba (SPAYD); the code is generated locally in the browser. */
export function summaryPaymentSpayd(
  bankAccount: string,
  amountCzk: number,
  variableSymbol: string,
): string | null {
  const iban = czechIban(bankAccount)
  if (
    !iban ||
    !Number.isSafeInteger(amountCzk) ||
    amountCzk <= 0 ||
    !/^\d{1,10}$/.test(variableSymbol)
  ) {
    return null
  }
  return `SPD*1.0*ACC:${iban}*AM:${amountCzk}.00*CC:CZK*X-VS:${variableSymbol}`
}
