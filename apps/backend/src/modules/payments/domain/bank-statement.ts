import { createHash } from "node:crypto"
import { computePayableAmount } from "@/modules/applications/domain/pricing"
import { parseVariableSymbol } from "@/modules/applications/domain/variable-symbol"

/**
 * Parser of a bank statement in CSV (US-42, D-125): the Fio export and a simple generic format
 * (header with `date`, `amount` and `variableSymbol`, optionally `id`, `name` and `message`; Czech
 * names `datum`, `částka`, `vs`, `název protiúčtu`, `zpráva` work too).
 */
export type StatementRow = {
  /** Id of the operation at the bank, or a hash of the row for the generic format. */
  externalId: string
  /** `YYYY-MM-DD` */
  bookedOn: string
  /** Hundredths of CZK; negative = outgoing. */
  amountCents: number
  /** Currency code of the statement row; null when the format has no such column. */
  currency: string | null
  variableSymbol: string | null
  counterpartyName: string | null
  message: string | null
}

export type ParsedStatement = {
  /** Incoming transactions (amount over 0). */
  incoming: StatementRow[]
  /** Outgoing transactions and zero amounts; not payments, so they are not stored. */
  ignoredCount: number
}

/** The upload limit of the endpoint; the parser refuses more, so loops over the text stay bounded. */
export const MAX_STATEMENT_CHARS = 2_000_000

export class InvalidStatementError extends Error {}

const FIELD_ALIASES: Record<string, string[]> = {
  id: ["id operace", "id", "id transakce"],
  date: ["datum", "date", "datum zaúčtování"],
  currency: ["měna", "mena", "currency"],
  amount: ["objem", "částka", "castka", "amount", "suma"],
  variableSymbol: ["vs", "variabilní symbol", "variabilni symbol", "variablesymbol"],
  name: ["název protiúčtu", "nazev protiuctu", "name", "jméno"],
  message: ["zpráva pro příjemce", "zprava pro prijemce", "message", "zpráva"],
}

const normalize = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, " ")

/** Splits CSV text into rows of fields; honours quotes with doubled quotes, CRLF and LF. */
export function splitCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  const length = Math.min(text.length, MAX_STATEMENT_CHARS)
  for (let i = 0; i < length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === delimiter) {
      row.push(field)
      field = ""
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else field += char
  }
  if (field !== "" || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** The row with the required columns, found in the rows parsed with one delimiter. */
function findHeader(rows: string[][]): { index: number; columns: Record<string, number> } | null {
  for (let i = 0; i < rows.length; i++) {
    const names = rows[i].map(normalize)
    const columns: Record<string, number> = {}
    for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
      // Aliases are in order of preference, so "Zpráva pro příjemce" beats a looser column.
      const index = aliases.map((alias) => names.indexOf(alias)).find((found) => found >= 0) ?? -1
      if (index >= 0) columns[key] = index
    }
    if (
      columns.date !== undefined &&
      columns.amount !== undefined &&
      columns.variableSymbol !== undefined
    )
      return { index: i, columns }
  }
  return null
}

/** `1 443,50`, `1443.50`, `-1034` → hundredths; null when it is not a number. */
export function parseAmountCents(value: string): number | null {
  const cleaned = value.replace(/[\s\u00a0]/g, "").replace(",", ".")
  if (!/^[+-]?\d+(\.\d{1,2})?$/.test(cleaned)) return null
  return Math.round(Number(cleaned) * 100)
}

/** `15.05.2026` or `2026-05-15` → `2026-05-15`; null for anything else or a date that does not exist. */
export function parseStatementDate(value: string): string | null {
  const text = value.trim()
  let year: number, month: number, day: number
  const czech = /^(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})$/.exec(text)
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (czech) [day, month, year] = [Number(czech[1]), Number(czech[2]), Number(czech[3])]
  else if (iso) [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])]
  else return null
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null
  return date.toISOString().slice(0, 10)
}

export function parseBankStatement(input: string): ParsedStatement {
  if (input.length > MAX_STATEMENT_CHARS) throw new InvalidStatementError("Statement too large")
  const text = input.replace(/^\uFEFF/, "")
  // The delimiter is the one under which the header is found, not a count of characters, which
  // free text (a message with semicolons) would skew. The Fio export has a preamble above it.
  let rows: string[][] = []
  let header: ReturnType<typeof findHeader> = null
  for (const delimiter of [";", ","]) {
    rows = splitCsv(text, delimiter)
    header = findHeader(rows)
    if (header) break
  }
  if (!header) throw new InvalidStatementError("Missing header with date, amount and VS")
  const headerIndex = header.index
  const columns = header.columns

  const incoming: StatementRow[] = []
  const seenHashes = new Map<string, number>()
  let ignoredCount = 0
  for (const row of rows.slice(headerIndex + 1)) {
    if (row.every((cell) => cell.trim() === "")) continue
    const cell = (key: string): string =>
      columns[key] === undefined ? "" : (row[columns[key]] ?? "").trim()
    const bookedOn = parseStatementDate(cell("date"))
    const amountCents = parseAmountCents(cell("amount"))
    if (bookedOn === null || amountCents === null)
      throw new InvalidStatementError(`Invalid row: ${row.join(";").slice(0, 80)}`)
    if (amountCents <= 0) {
      ignoredCount++
      continue
    }
    const currency = cell("currency").toUpperCase() || null
    const variableSymbol = cell("variableSymbol") || null
    const counterpartyName = cell("name") || null
    const message = cell("message") || null
    let externalId = cell("id")
    if (!externalId) {
      // No bank id: two identical rows of one file are two payments, so count the repeats.
      const hash = createHash("sha1")
        .update([bookedOn, amountCents, variableSymbol, counterpartyName, message].join("|"))
        .digest("hex")
        .slice(0, 16)
      const occurrence = (seenHashes.get(hash) ?? 0) + 1
      seenHashes.set(hash, occurrence)
      externalId = `gen-${hash}-${occurrence}`
    }
    incoming.push({
      externalId,
      bookedOn,
      amountCents,
      currency,
      variableSymbol,
      counterpartyName,
      message,
    })
  }
  return { incoming, ignoredCount }
}

export type UnmatchedReason =
  "NO_VARIABLE_SYMBOL" | "UNKNOWN_VARIABLE_SYMBOL" | "UNSUPPORTED_CURRENCY" | "AMOUNT_NOT_WHOLE"

/** What matching needs to know about the application a variable symbol points to. */
export type MatchableApplication = {
  id: string
  terms: { termId: string; termNumber: number; status: string; owedCzk: number }[]
}

export type MatchDecision =
  | {
      kind: "matched"
      applicationId: string
      /** Undefined = summary symbol, the payment is split over the confirmed terms. */
      termId?: string
      amountCzk: number
      /** The part of the amount above what is owed; 0 when none. */
      overpaidCzk: number
    }
  | { kind: "unmatched"; reason: UnmatchedReason; applicationId?: string }

/**
 * Decides one incoming transaction. `findApplication` is looked up by the application number
 * inside the variable symbol (the repository restricts it to the event).
 */
export function decideMatch(
  row: Pick<StatementRow, "variableSymbol" | "amountCents" | "currency">,
  application: MatchableApplication | null,
): MatchDecision {
  // Amounts are whole CZK everywhere; a foreign currency is never taken at its nominal value.
  if (row.currency !== null && row.currency !== "CZK")
    return { kind: "unmatched", reason: "UNSUPPORTED_CURRENCY", applicationId: application?.id }
  if (!row.variableSymbol) return { kind: "unmatched", reason: "NO_VARIABLE_SYMBOL" }
  if (!application) return { kind: "unmatched", reason: "UNKNOWN_VARIABLE_SYMBOL" }
  const parsed = parseVariableSymbol(row.variableSymbol)
  if (!parsed) return { kind: "unmatched", reason: "UNKNOWN_VARIABLE_SYMBOL" }
  if (row.amountCents % 100 !== 0)
    return { kind: "unmatched", reason: "AMOUNT_NOT_WHOLE", applicationId: application.id }
  const amountCzk = row.amountCents / 100
  // D-088: money for a term without a debt (substitute, cancelled, paid) is an overpayment of that
  // application in the term, nothing is refused. So any term of the application can be paid.
  if (parsed.termNumber === null) {
    const payable = computePayableAmount(application.terms.map((term) => term.owedCzk))
    return {
      kind: "matched",
      applicationId: application.id,
      amountCzk,
      overpaidCzk: Math.max(amountCzk - payable, 0),
    }
  }
  const term = application.terms.find((candidate) => candidate.termNumber === parsed.termNumber)
  if (!term)
    return { kind: "unmatched", reason: "UNKNOWN_VARIABLE_SYMBOL", applicationId: application.id }
  return {
    kind: "matched",
    applicationId: application.id,
    termId: term.termId,
    amountCzk,
    overpaidCzk: Math.max(amountCzk - Math.max(term.owedCzk, 0), 0),
  }
}
