/**
 * Two-level variable symbol (D-051): `Application.number × 1000 + Term.number`.
 * Term number 0 (`…000`) is the summary of the whole application, `…nnn` pays one
 * term. It is never stored — always derived from the two numbers.
 */
export const SUMMARY_TERM_NUMBER = 0
export const MAX_TERM_NUMBER = 999

/** `Application.number` stays below this so VS from 9 000 000 000 is free for a submission summary. */
export const MAX_APPLICATION_NUMBER = 8_999_999

export function variableSymbol(applicationNumber: number, termNumber?: number): string {
  const term = termNumber ?? SUMMARY_TERM_NUMBER
  if (!Number.isInteger(applicationNumber) || applicationNumber < 1) {
    throw new RangeError(`Invalid application number: ${applicationNumber}`)
  }
  if (applicationNumber > MAX_APPLICATION_NUMBER) {
    throw new RangeError(`Application number over ${MAX_APPLICATION_NUMBER}: ${applicationNumber}`)
  }
  if (!Number.isInteger(term) || term < 0 || term > MAX_TERM_NUMBER) {
    throw new RangeError(`Invalid term number: ${term}`)
  }
  return String(applicationNumber * 1000 + term)
}

export type ParsedVariableSymbol = {
  applicationNumber: number
  /** `null` for the summary symbol `…000`. */
  termNumber: number | null
}

/** Inverse of `variableSymbol`. Read as an integer, so leading zeros do not matter. */
export function parseVariableSymbol(symbol: string): ParsedVariableSymbol | null {
  if (!/^\d{1,10}$/.test(symbol)) return null
  const value = Number(symbol)
  const applicationNumber = Math.floor(value / 1000)
  if (applicationNumber < 1 || applicationNumber > MAX_APPLICATION_NUMBER) return null
  const termNumber = value % 1000
  return { applicationNumber, termNumber: termNumber === SUMMARY_TERM_NUMBER ? null : termNumber }
}
