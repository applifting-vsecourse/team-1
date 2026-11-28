import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import { computeSummaryPayableAmount } from "@/modules/applications/domain/pricing"
import { parseVariableSymbol } from "@/modules/applications/domain/variable-symbol"

/**
 * Parser of the Fio CSV statement (US-42, D-125): semicolon separated, a preamble above the header
 * row with `ID operace`, `Datum`, `Objem`, `Měna`, `VS`, `Název protiúčtu` and `Zpráva pro příjemce`.
 */
export type StatementRow = {
  /** Id of the operation at the bank (`ID operace`). */
  externalId: string
  /** `YYYY-MM-DD` */
  bookedOn: string
  /** Hundredths of CZK; negative = outgoing. */
  amountCents: number
  /** Currency code of the statement row; null when the export has no such column. */
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
  /** Position of each incoming row among the records of the CSV text, parallel to `incoming`. */
  incomingRecords: number[]
  /** Position of each ignored row, for the copy of the statement with the result (US-561). */
  ignoredRecords: number[]
  /** Position of the header row. */
  headerRecord: number
}

/** The upload limit of the endpoint; the parser refuses more, so loops over the text stay bounded. */
export const MAX_STATEMENT_CHARS = 2_000_000

export class InvalidStatementError extends Error {}

const FIELD_ALIASES: Record<string, string> = {
  id: "id operace",
  date: "datum",
  currency: "měna",
  amount: "objem",
  variableSymbol: "vs",
  name: "název protiúčtu",
  message: "zpráva pro příjemce",
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

/** The row with the required columns, found below the preamble of the Fio export. */
function findHeader(rows: string[][]): { index: number; columns: Record<string, number> } | null {
  for (let i = 0; i < rows.length; i++) {
    const names = rows[i].map(normalize)
    const columns: Record<string, number> = {}
    for (const [key, name] of Object.entries(FIELD_ALIASES)) {
      const index = names.indexOf(name)
      if (index >= 0) columns[key] = index
    }
    if (
      columns.id !== undefined &&
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

/** `15.05.2026` → `2026-05-15`; null for anything else or a date that does not exist. */
export function parseStatementDate(value: string): string | null {
  const text = value.trim()
  const czech = /^(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})$/.exec(text)
  if (!czech) return null
  const [day, month, year] = [Number(czech[1]), Number(czech[2]), Number(czech[3])]
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
  const rows = splitCsv(text, ";")
  const header = findHeader(rows)
  if (!header) throw new InvalidStatementError("Missing header with ID, date, amount and VS")
  const headerIndex = header.index
  const columns = header.columns

  const incoming: StatementRow[] = []
  const incomingRecords: number[] = []
  const ignoredRecords: number[] = []
  let ignoredCount = 0
  for (const [offset, row] of rows.slice(headerIndex + 1).entries()) {
    const record = headerIndex + 1 + offset
    if (row.every((cell) => cell.trim() === "")) continue
    const cell = (key: string): string =>
      columns[key] === undefined ? "" : (row[columns[key]] ?? "").trim()
    const bookedOn = parseStatementDate(cell("date"))
    const amountCents = parseAmountCents(cell("amount"))
    if (bookedOn === null || amountCents === null)
      throw new InvalidStatementError(`Invalid row: ${row.join(";").slice(0, 80)}`)
    if (amountCents <= 0) {
      ignoredCount++
      ignoredRecords.push(record)
      continue
    }
    const rawCurrency = cell("currency").toUpperCase()
    const currency = rawCurrency || null
    if (currency !== null && !/^[A-Z]{3}$/.test(currency))
      throw new InvalidStatementError(`Invalid currency: ${currency.slice(0, 10)}`)
    const variableSymbol = cell("variableSymbol") || null
    const counterpartyName = cell("name") || null
    const message = cell("message") || null
    const externalId = cell("id")
    if (!externalId)
      throw new InvalidStatementError(`Row without ID operace: ${row.join(";").slice(0, 80)}`)
    incoming.push({
      externalId,
      bookedOn,
      amountCents,
      currency,
      variableSymbol,
      counterpartyName,
      message,
    })
    incomingRecords.push(record)
  }
  return { incoming, ignoredCount, incomingRecords, ignoredRecords, headerRecord: headerIndex }
}

export type UnmatchedReason =
  "NO_VARIABLE_SYMBOL" | "UNKNOWN_VARIABLE_SYMBOL" | "UNSUPPORTED_CURRENCY" | "AMOUNT_NOT_WHOLE"

/** What matching needs to know about the application a variable symbol points to. */
export type MatchableApplication = {
  id: string
  terms: { termId: string; termNumber: number; status: ApplicationTermStatus; owedCzk: number }[]
}

/** The application found for a variable symbol, with what the copy of the statement says about it. */
export type FoundApplication = MatchableApplication & {
  number: number
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
 * The unmatched reason of a match the automatic import could not have made (no variable symbol, or
 * one that does not name this application), so it was assigned by hand; null when it could have.
 */
export function manualMatchReason(
  variableSymbol: string | null,
  applicationNumber: number,
): UnmatchedReason | null {
  if (!variableSymbol) return "NO_VARIABLE_SYMBOL"
  return parseVariableSymbol(variableSymbol)?.applicationNumber === applicationNumber
    ? null
    : "UNKNOWN_VARIABLE_SYMBOL"
}

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
    // D-087: the split skips archived (closed) terms; with none left the money has no place to go,
    // so it is left for the organizer instead of failing the whole import.
    if (application.terms.every((term) => term.status === "ARCHIVED"))
      return { kind: "unmatched", reason: "UNKNOWN_VARIABLE_SYMBOL", applicationId: application.id }
    // The same amount the split settles (confirmed debt only); the rest is the overpayment (D-088).
    const payable = computeSummaryPayableAmount(application.terms)
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
