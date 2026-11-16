import {
  decideMatch,
  InvalidStatementError,
  parseAmountCents,
  parseBankStatement,
  parseStatementDate,
} from "./bank-statement"

const FIO = [
  '﻿"Výpis č. 5/2026 z účtu ""7594315496/2010"""',
  "Období: 01.05.2026 - 31.05.2026",
  "",
  "ID operace;Datum;Objem;Měna;Protiúčet;Název protiúčtu;Kód banky;Název banky;KS;VS;SS;Poznámka;Zpráva pro příjemce;Typ",
  "27618911774;05.05.2026;6900;CZK;1291314181;Hana Novotná;800;Česká spořitelna, a.s.;0;12001;;;Záloha kemp;Okamžitá příchozí platba",
  "27619778153;06.05.2026;-1034;CZK;;Fio MC Debit;;;;7324;;Nákup: zooplus;;Karetní transakce",
  "27619778154;07.05.2026;1443,50;CZK;1;Jan Novák;800;ČS;;;;;;Příchozí platba",
].join("\r\n")

describe("parseBankStatement", () => {
  it("reads the Fio export: skips the preamble, keeps incoming, ignores outgoing", () => {
    const { incoming, ignoredCount } = parseBankStatement(FIO)
    expect(ignoredCount).toBe(1)
    expect(incoming).toEqual([
      {
        externalId: "27618911774",
        bookedOn: "2026-05-05",
        amountCents: 690000,
        currency: "CZK",
        variableSymbol: "12001",
        counterpartyName: "Hana Novotná",
        message: "Záloha kemp",
      },
      {
        externalId: "27619778154",
        bookedOn: "2026-05-07",
        amountCents: 144350,
        currency: "CZK",
        variableSymbol: null,
        counterpartyName: "Jan Novák",
        message: null,
      },
    ])
  })

  it("reads a generic comma separated CSV and numbers identical rows so a re-upload yields the same ids", () => {
    const csv = "date,amount,vs,name\n2026-05-05,500,12001,A\n2026-05-05,500,12001,A\n"
    const first = parseBankStatement(csv).incoming
    expect(first.map((row) => row.externalId)).toEqual([
      expect.stringMatching(/^gen-[0-9a-f]{16}-1$/),
      expect.stringMatching(/^gen-[0-9a-f]{16}-2$/),
    ])
    expect(parseBankStatement(csv).incoming.map((row) => row.externalId)).toEqual(
      first.map((row) => row.externalId),
    )
  })

  it("finds the header whatever the free text holds, so semicolons in a message do not pick the delimiter", () => {
    const csv = 'date,amount,vs,message\n2026-05-05,500,12001,"a;b;c;d;e;f;g;h"'
    expect(parseBankStatement(csv).incoming).toMatchObject([
      { amountCents: 50000, variableSymbol: "12001", message: "a;b;c;d;e;f;g;h" },
    ])
  })

  it("rejects a file without the columns or with a broken row", () => {
    expect(() => parseBankStatement("a;b\n1;2")).toThrow(InvalidStatementError)
    expect(() => parseBankStatement("datum;částka;měna;vs\n05.05.2026;5;C!;1")).toThrow(
      InvalidStatementError,
    )
    expect(() => parseBankStatement("datum;částka;vs\nnonsense;5;1")).toThrow(InvalidStatementError)
  })
})

describe("parsing values", () => {
  it("parses amounts and dates", () => {
    expect(parseAmountCents("1 443,50")).toBe(144350)
    expect(parseAmountCents("-1034")).toBe(-103400)
    expect(parseAmountCents("abc")).toBeNull()
    expect(parseStatementDate("05.05.2026")).toBe("2026-05-05")
    expect(parseStatementDate("2026-02-30")).toBeNull()
  })
})

describe("decideMatch", () => {
  const application = {
    id: "a1",
    terms: [
      { termId: "t1", termNumber: 1, status: "CONFIRMED", owedCzk: 6900 },
      { termId: "t2", termNumber: 2, status: "WAITLISTED", owedCzk: 0 },
    ],
  }
  const row = (
    variableSymbol: string | null,
    amountCents: number,
    currency: string | null = "CZK",
  ) => ({
    variableSymbol,
    amountCents,
    currency,
  })

  it("matches a term symbol and reports an overpayment", () => {
    expect(decideMatch(row("12001", 690000), application)).toEqual({
      kind: "matched",
      applicationId: "a1",
      termId: "t1",
      amountCzk: 6900,
      overpaidCzk: 0,
    })
    expect(decideMatch(row("12001", 700000), application)).toMatchObject({ overpaidCzk: 100 })
  })

  it("records money for a term without a debt as an overpayment (D-088)", () => {
    expect(decideMatch(row("12002", 100000), application)).toEqual({
      kind: "matched",
      applicationId: "a1",
      termId: "t2",
      amountCzk: 1000,
      overpaidCzk: 1000,
    })
  })

  it("matches the summary symbol over the confirmed terms", () => {
    expect(decideMatch(row("12000", 100000), application)).toMatchObject({
      kind: "matched",
      overpaidCzk: 0,
    })
  })

  it("leaves what it cannot place unmatched, with the reason", () => {
    expect(decideMatch(row(null, 100000), application)).toMatchObject({
      reason: "NO_VARIABLE_SYMBOL",
    })
    expect(decideMatch(row("99001", 100000), null)).toMatchObject({
      reason: "UNKNOWN_VARIABLE_SYMBOL",
    })
    expect(decideMatch(row("12005", 100000), application)).toMatchObject({
      reason: "UNKNOWN_VARIABLE_SYMBOL",
      applicationId: "a1",
    })
    expect(decideMatch(row("12001", 10000, "EUR"), application)).toMatchObject({
      reason: "UNSUPPORTED_CURRENCY",
    })
    expect(decideMatch(row("12001", 100050), application)).toMatchObject({
      reason: "AMOUNT_NOT_WHOLE",
    })
  })
})
