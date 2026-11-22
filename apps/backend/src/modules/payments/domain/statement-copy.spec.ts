import { parseBankStatement, UnmatchedReason } from "./bank-statement"
import { annotateStatement, RowOutcome } from "./statement-copy"

const HEADER = "ID operace;Datum;Objem;Měna;Název protiúčtu;VS;Zpráva pro příjemce"
const FIO = [
  '﻿"Výpis č. 5/2026"',
  "Období: 01.05.2026 - 31.05.2026",
  "",
  HEADER,
  "1;05.05.2026;6900;CZK;Hana Novotná;12001;Záloha",
  "2;06.05.2026;-1034;CZK;Fio MC Debit;;Nákup",
  '3;07.05.2026;100;CZK;"Jan; ""Novák""";;',
].join("\r\n")

function annotate(
  text: string,
  outcomeFor: (index: number) => RowOutcome,
  locale: "cs" | "en" = "cs",
): string {
  const statement = parseBankStatement(text)
  const outcomes = new Map<number, RowOutcome>()
  statement.incomingRecords.forEach((record, index) => outcomes.set(record, outcomeFor(index)))
  statement.ignoredRecords.forEach((record) => outcomes.set(record, { kind: "ignored" }))
  return annotateStatement(text, statement.headerRecord, outcomes, locale)
}

describe("parseBankStatement record positions", () => {
  it("tells where the header and each row are, counting the preamble", () => {
    const statement = parseBankStatement(FIO)
    expect(statement.headerRecord).toBe(3)
    expect(statement.incomingRecords).toEqual([4, 6])
    expect(statement.ignoredRecords).toEqual([5])
  })
})

describe("annotateStatement", () => {
  it("adds the result column to the header and every row, the rest stays byte for byte", () => {
    const result = annotate(FIO, (index) =>
      index === 0
        ? { kind: "matched", applicationNumber: 12, termNumber: 1 }
        : { kind: "unmatched", reason: "NO_VARIABLE_SYMBOL" },
    )
    const lines = result.split("\r\n")
    // Preamble, even the quoted title with the BOM, is left as it was.
    expect(lines.slice(0, 3)).toEqual(FIO.split("\r\n").slice(0, 3))
    expect(lines[3]).toBe(`${HEADER};Výsledek párování`)
    expect(lines[4]).toBe(
      "1;05.05.2026;6900;CZK;Hana Novotná;12001;Záloha;Spárováno: přihláška č. 12, termín 1",
    )
    expect(lines[5]).toBe("2;06.05.2026;-1034;CZK;Fio MC Debit;;Nákup;Přeskočeno: odchozí platba")
    expect(lines[6]).toBe(
      '3;07.05.2026;100;CZK;"Jan; ""Novák""";;;Nespárováno: chybí variabilní symbol',
    )
  })

  it.each<[UnmatchedReason, string, string]>([
    ["NO_VARIABLE_SYMBOL", "Nespárováno: chybí variabilní symbol", "Unmatched: no variable symbol"],
    [
      "UNKNOWN_VARIABLE_SYMBOL",
      "Nespárováno: variabilní symbol neodpovídá přihlášce ani termínu, na který lze platbu zapsat",
      "Unmatched: the variable symbol matches no application or term the payment can be recorded on",
    ],
    ["UNSUPPORTED_CURRENCY", "Nespárováno: měna není CZK", "Unmatched: the currency is not CZK"],
    [
      "AMOUNT_NOT_WHOLE",
      "Nespárováno: částka není v celých korunách",
      "Unmatched: the amount is not in whole crowns",
    ],
  ])("says why %s stayed unmatched, in the request language", (reason, cs, en) => {
    const text = `${HEADER}\n1;05.05.2026;5;CZK;X;1;`
    const outcome = (): RowOutcome => ({ kind: "unmatched", reason })
    expect(annotate(text, outcome, "cs").split("\n")[1]).toMatch(`;${cs}`)
    expect(annotate(text, outcome, "en").split("\n")[1]).toMatch(`;${en}`)
    expect(annotate(text, outcome, "en").split("\n")[0]).toBe(`${HEADER};Matching result`)
  })

  it("says it was a summary payment for a summary variable symbol", () => {
    const text = `${HEADER}\n1;05.05.2026;5000;CZK;X;12000;`
    const outcome: RowOutcome = {
      kind: "matched",
      applicationNumber: 12,
    }
    expect(annotate(text, () => outcome, "cs")).toContain(
      ";Spárováno: přihláška č. 12, souhrnná platba",
    )
    expect(annotate(text, () => outcome, "en")).toContain(
      ";Matched: application no. 12, summary payment",
    )
  })

  it("puts the result under its header when a row lacks the trailing empty columns", () => {
    const text = "ID operace;Datum;Objem;VS;Zpráva pro příjemce\n1;05.05.2026;100;12001"
    expect(annotate(text, () => ({ kind: "duplicate" }), "en")).toBe(
      [
        "ID operace;Datum;Objem;VS;Zpráva pro příjemce;Matching result",
        "1;05.05.2026;100;12001;;Skipped: already imported earlier",
      ].join("\n"),
    )
  })

  it("marks a row that an earlier upload already imported", () => {
    const text = `${HEADER}\n1;05.05.2026;5;CZK;X;1;`
    expect(annotate(text, () => ({ kind: "duplicate" }), "en")).toContain(
      ";Skipped: already imported earlier",
    )
  })

  it.each(["cs", "en"] as const)(
    "adds only the application number in %s, preserving the original payer",
    (locale) => {
      const text = `${HEADER}\n1;05.05.2026;5;CZK;"Ann; ""A""";12001;`
      const result = annotate(
        text,
        () => ({ kind: "matched", applicationNumber: 12, termNumber: 1 }),
        locale,
      )
      const [row] = parseBankStatement(result).incoming
      expect(row.counterpartyName).toBe('Ann; "A"')
      const outcome = result.split("\n")[1].slice(text.split("\n")[1].length)
      expect(outcome).toBe(
        locale === "cs"
          ? ";Spárováno: přihláška č. 12, termín 1"
          : ";Matched: application no. 12, term 1",
      )
      expect(outcome).not.toContain("Ann")
    },
  )

  it("keeps LF endings, a quoted line break and a last row without a line ending", () => {
    const text = `${HEADER}\n1;05.05.2026;5;CZK;"two\nlines";1;\n2;06.05.2026;5;CZK;X;2;`
    const result = annotate(text, () => ({ kind: "unmatched", reason: "NO_VARIABLE_SYMBOL" }), "en")
    expect(result).toBe(
      [
        `${HEADER};Matching result`,
        '1;05.05.2026;5;CZK;"two\nlines";1;;Unmatched: no variable symbol',
        "2;06.05.2026;5;CZK;X;2;;Unmatched: no variable symbol",
      ].join("\n"),
    )
  })
})
