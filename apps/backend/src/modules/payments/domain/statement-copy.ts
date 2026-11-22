import { Locale } from "@/core/email/locale"
import { splitCsv, UnmatchedReason } from "@/modules/payments/domain/bank-statement"

/** What happened to one row of the uploaded statement (US-561). */
export type RowOutcome =
  | {
      kind: "matched"
      applicationNumber: number
      /** Undefined = summary symbol, the payment is spread over the terms of the application. */
      termNumber?: number
    }
  | { kind: "unmatched"; reason: UnmatchedReason }
  /** Imported by an earlier upload, not counted again. */
  | { kind: "duplicate" }
  /** An outgoing transaction, not a payment. */
  | { kind: "ignored" }

type Copy = {
  header: string
  matched: (outcome: Extract<RowOutcome, { kind: "matched" }>) => string
  unmatched: Record<UnmatchedReason, string>
  duplicate: string
  ignored: string
}

const COPY: Record<Locale, Copy> = {
  cs: {
    header: "Výsledek párování",
    matched: (outcome) =>
      `Spárováno: přihláška č. ${outcome.applicationNumber}, ` +
      (outcome.termNumber === undefined ? "souhrnná platba" : `termín ${outcome.termNumber}`),
    unmatched: {
      NO_VARIABLE_SYMBOL: "Nespárováno: chybí variabilní symbol",
      UNKNOWN_VARIABLE_SYMBOL:
        "Nespárováno: variabilní symbol neodpovídá přihlášce ani termínu, na který lze platbu zapsat",
      UNSUPPORTED_CURRENCY: "Nespárováno: měna není CZK",
      AMOUNT_NOT_WHOLE: "Nespárováno: částka není v celých korunách",
    },
    duplicate: "Přeskočeno: už nahráno dříve",
    ignored: "Přeskočeno: odchozí platba",
  },
  en: {
    header: "Matching result",
    matched: (outcome) =>
      `Matched: application no. ${outcome.applicationNumber}, ` +
      (outcome.termNumber === undefined ? "summary payment" : `term ${outcome.termNumber}`),
    unmatched: {
      NO_VARIABLE_SYMBOL: "Unmatched: no variable symbol",
      UNKNOWN_VARIABLE_SYMBOL:
        "Unmatched: the variable symbol matches no application or term the payment can be recorded on",
      UNSUPPORTED_CURRENCY: "Unmatched: the currency is not CZK",
      AMOUNT_NOT_WHOLE: "Unmatched: the amount is not in whole crowns",
    },
    duplicate: "Skipped: already imported earlier",
    ignored: "Skipped: outgoing transaction",
  },
}

const DELIMITER = ";"

function cell(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Same record boundaries as `splitCsv`: a newline outside quotes ends a record. */
function splitRecords(text: string): { content: string; eol: string }[] {
  const records: { content: string; eol: string }[] = []
  let quoted = false
  let start = 0
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') quoted = !quoted
    else if (!quoted && (char === "\n" || char === "\r")) {
      const eol = char === "\r" && text[i + 1] === "\n" ? "\r\n" : char
      records.push({ content: text.slice(start, i), eol })
      i += eol.length - 1
      start = i + 1
    }
  }
  if (start < text.length) records.push({ content: text.slice(start), eol: "" })
  return records
}

/**
 * The uploaded statement with one more column at the end of the header row and of every
 * transaction row: what the import did with it. The rest of the text stays as it was uploaded
 * (delimiter, quoting, line endings, preamble), so it opens the same way as the original.
 *
 * @param outcomes by record position, see `ParsedStatement`
 */
export function annotateStatement(
  text: string,
  headerRecord: number,
  outcomes: ReadonlyMap<number, RowOutcome>,
  locale: Locale,
): string {
  const copy = COPY[locale]
  const describe = (outcome: RowOutcome): string => {
    if (outcome.kind === "matched") return copy.matched(outcome)
    if (outcome.kind === "unmatched") return copy.unmatched[outcome.reason]
    return outcome.kind === "duplicate" ? copy.duplicate : copy.ignored
  }
  const records = splitRecords(text)
  const width = splitCsv(records[headerRecord]?.content ?? "", DELIMITER)[0]?.length ?? 0
  // The parser accepts a row without its trailing empty columns; the result still goes under its header.
  const added = (content: string, value: string): string => {
    const missing = Math.max(width - (splitCsv(content, DELIMITER)[0]?.length ?? 0), 0)
    return `${content}${DELIMITER.repeat(missing)}${DELIMITER}${cell(value)}`
  }
  return records
    .map(({ content, eol }, index) => {
      const outcome = outcomes.get(index)
      if (index === headerRecord) return `${added(content, copy.header)}${eol}`
      return `${outcome ? added(content, describe(outcome)) : content}${eol}`
    })
    .join("")
}
