import { createHash } from "node:crypto"
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

export class InvalidStatementError extends Error {}

const FIELD_ALIASES: Record<string, string[]> = {
  id: ["id operace", "id", "id transakce"],
  date: ["datum", "date", "datum zaúčtování"],
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
  for (let i = 0; i < text.length; i++) {
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

function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 20).join("\n")
  const semicolons = (sample.match(/;/g) ?? []).length
  const commas = (sample.match(/,/g) ?? []).length
  return semicolons >= commas ? ";" : ","
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
  const text = input.replace(/^\uFEFF/, "")
  const rows = splitCsv(text, detectDelimiter(text))
  // The Fio export has an info preamble above the header; find the first row that has the columns.
  let headerIndex = -1
  let columns: Record<string, number> = {}
  for (let i = 0; i < rows.length && headerIndex < 0; i++) {
    const names = rows[i].map(normalize)
    const found: Record<string, number> = {}
    for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
      // Aliases are in order of preference, so "Zpráva pro příjemce" beats a looser column.
      const index = aliases.map((alias) => names.indexOf(alias)).find((found) => found >= 0) ?? -1
      if (index >= 0) found[key] = index
    }
    if (
      found.date !== undefined &&
      found.amount !== undefined &&
      found.variableSymbol !== undefined
    ) {
      headerIndex = i
      columns = found
    }
  }
  if (headerIndex < 0) throw new InvalidStatementError("Missing header with date, amount and VS")

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
    incoming.push({ externalId, bookedOn, amountCents, variableSymbol, counterpartyName, message })
  }
  return { incoming, ignoredCount }
}

export type UnmatchedReason =
  "NO_VARIABLE_SYMBOL" | "UNKNOWN_VARIABLE_SYMBOL" | "TERM_NOT_PAYABLE" | "AMOUNT_NOT_WHOLE"

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
  row: Pick<StatementRow, "variableSymbol" | "amountCents">,
  application: MatchableApplication | null,
): MatchDecision {
  if (!row.variableSymbol) return { kind: "unmatched", reason: "NO_VARIABLE_SYMBOL" }
  if (!application) return { kind: "unmatched", reason: "UNKNOWN_VARIABLE_SYMBOL" }
  const parsed = parseVariableSymbol(row.variableSymbol)
  if (!parsed) return { kind: "unmatched", reason: "UNKNOWN_VARIABLE_SYMBOL" }
  if (row.amountCents % 100 !== 0)
    return { kind: "unmatched", reason: "AMOUNT_NOT_WHOLE", applicationId: application.id }
  const amountCzk = row.amountCents / 100
  const confirmed = application.terms.filter((term) => term.status === "CONFIRMED")
  if (parsed.termNumber === null) {
    if (!confirmed.length)
      return { kind: "unmatched", reason: "TERM_NOT_PAYABLE", applicationId: application.id }
    const payable = confirmed.reduce((sum, term) => sum + Math.max(term.owedCzk, 0), 0)
    return {
      kind: "matched",
      applicationId: application.id,
      amountCzk,
      overpaidCzk: Math.max(amountCzk - payable, 0),
    }
  }
  const term = confirmed.find((candidate) => candidate.termNumber === parsed.termNumber)
  if (!term) return { kind: "unmatched", reason: "TERM_NOT_PAYABLE", applicationId: application.id }
  return {
    kind: "matched",
    applicationId: application.id,
    termId: term.termId,
    amountCzk,
    overpaidCzk: Math.max(amountCzk - Math.max(term.owedCzk, 0), 0),
  }
}
