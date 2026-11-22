import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import { parseVariableSymbol } from "@/modules/applications/domain/variable-symbol"

/** How many applications the search of a manual match hands back. */
export const MAX_CANDIDATES = 10

export type CandidateSource = {
  id: string
  number: number
  firstName: string
  lastName: string
  terms: {
    termId: string
    termNumber: number
    name: string | null
    startsOn: string
    endsOn: string
    status: ApplicationTermStatus
    owedCzk: number
    paidCzk: number
  }[]
}

const normalize = (value: string): string =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()

/**
 * Applications for the manual match of a bank transaction: a number is a variable symbol (or else
 * an application number), anything else is words of the name, without diacritics and case.
 */
export function findCandidates(rows: CandidateSource[], query: string): CandidateSource[] {
  const text = query.trim()
  if (text === "") return []
  let matches: (row: CandidateSource) => boolean
  if (/^\d+$/.test(text)) {
    const parsed = parseVariableSymbol(text)
    const number = Number(text)
    matches = (row) => row.number === (parsed?.applicationNumber ?? number) || row.number === number
  } else {
    const words = normalize(text).split(/\s+/).filter(Boolean)
    matches = (row) => {
      const name = normalize(`${row.firstName} ${row.lastName}`)
      return words.every((word) => name.includes(word))
    }
  }
  return rows
    .filter(matches)
    .sort((a, b) => a.number - b.number)
    .slice(0, MAX_CANDIDATES)
}

/** A transaction can be assigned by hand only in crowns and in whole crowns. */
export function isAssignable(transaction: { amountCents: number; currency: string }): boolean {
  return transaction.currency === "CZK" && transaction.amountCents % 100 === 0
}
