import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import {
  allEmailsTo,
  api,
  connectTestPrisma,
  hasSentNothingTo,
  resetAndSeed,
  signIn,
} from "@/test/integration/test-api"

type ImportResult = {
  matchedCount: number
  matchedCzk: number
  unmatchedCount: number
  overpaidCount: number
  overpaidCzk: number
  duplicateCount: number
  ignoredCount: number
}

describe("bank statement import (US-42)", () => {
  let prisma: PrismaService
  let cookie: string
  let eventId: string
  let numbers: { first: number; second: number }
  let firstTerm: { id: string; number: number }

  const upload = (
    csv: string,
    auth: string | undefined = cookie,
    id = eventId,
  ): Promise<Response> =>
    fetch(api(`/organizer/events/${id}/bank-statements`), {
      method: "POST",
      headers: { "Content-Type": "text/csv", ...(auth ? { Cookie: auth } : {}) },
      body: csv,
    })

  const statement = (id: string, rows: [amount: number, vs: string, currency?: string][]): string =>
    [
      "ID operace;Datum;Objem;Měna;Protiúčet;Název protiúčtu;Kód banky;Název banky;KS;VS;SS;Poznámka;Zpráva pro příjemce;Typ",
      ...rows.map(
        ([amount, vs, currency = "CZK"], index) =>
          `${id}${index};05.05.2026;${amount};${currency};1;Test Payer;800;CS;;${vs};;;;Platba`,
      ),
    ].join("\r\n")

  const createApplication = async (confirmed: boolean): Promise<number> => {
    const event = await prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      include: { terms: { orderBy: { startsOn: "asc" } } },
    })
    const application = await prisma.application.create({
      data: {
        organizationId: event.organizationId,
        eventId,
        accessToken: `bank-test-${randomUUID()}`,
        firstName: "Bank",
        lastName: "Test",
        birthDate: new Date("2000-01-01"),
        gender: "FEMALE",
        email: `bank-${randomUUID()}@example.com`,
        consentAt: new Date(),
        terms: {
          create: [
            {
              organizationId: event.organizationId,
              termId: event.terms[0].id,
              status: confirmed ? "CONFIRMED" : "WAITLISTED",
              priceCzk: 6900,
            },
          ],
        },
      },
    })
    firstTerm = { id: event.terms[0].id, number: event.terms[0].number }
    return application.number
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    eventId = (
      await prisma.event.findUniqueOrThrow({ where: { publicToken: "demo-letni-kemp-2027" } })
    ).id
    numbers = { first: await createApplication(true), second: await createApplication(false) }
  })
  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it("matches by variable symbol, keeps the rest with a reason, and counts a re-upload once", async () => {
    const vs = numbers.first * 1000 + firstTerm.number
    const waitlistedVs = numbers.second * 1000 + firstTerm.number
    const id = String(Date.now())
    const csv = statement(id, [
      [7000, String(vs)],
      [100, String(waitlistedVs)],
      [200, ""],
      [300, "9999999001"],
      [400, String(vs), "EUR"],
      [-50, String(vs)],
    ])
    const response = await upload(csv)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      matchedCount: 2,
      matchedCzk: 7100,
      overpaidCount: 2,
      overpaidCzk: 200,
      unmatchedCount: 3,
      // The 400 EUR are not crowns.
      unmatchedCzk: 500,
      duplicateCount: 0,
      ignoredCount: 1,
    })
    const rows = await prisma.payment.findMany({
      where: { applicationTerm: { application: { number: numbers.first } } },
    })
    expect(rows).toMatchObject([{ amountCzk: 7000, source: "BANK_IMPORT" }])
    // D-088: money for a term without a debt stays with its application as an overpayment.
    expect(
      await prisma.payment.count({
        where: { applicationTerm: { application: { number: numbers.second } }, amountCzk: 100 },
      }),
    ).toBe(1)

    const again = (await (await upload(csv)).json()) as ImportResult
    expect(again).toMatchObject({ matchedCount: 0, unmatchedCount: 3, duplicateCount: 2 })
    expect(
      await prisma.payment.count({
        where: { applicationTerm: { application: { number: numbers.first } } },
      }),
    ).toBe(1)

    const unmatched = (await (
      await fetch(api(`/organizer/events/${eventId}/bank-transactions/unmatched`), {
        headers: { Cookie: cookie },
      })
    ).json()) as { transactions: { reason: string }[] }
    expect(unmatched.transactions.map((row) => row.reason).sort()).toEqual([
      "NO_VARIABLE_SYMBOL",
      "UNKNOWN_VARIABLE_SYMBOL",
      "UNSUPPORTED_CURRENCY",
    ])
  })

  it("hands back the uploaded CSV with the result of each row, in the request language (US-561)", async () => {
    const confirmedNumber = await createApplication(true)
    const id = String(Date.now())
    const rows: [number, string][] = [
      [7000, String(confirmedNumber * 1000 + firstTerm.number)],
      [200, ""],
      [-50, "1"],
      [100, String(confirmedNumber * 1000)],
    ]
    const csv = statement(id, rows)
    const send = async (language: string): Promise<string[]> => {
      const response = await fetch(api(`/organizer/events/${eventId}/bank-statements`), {
        method: "POST",
        headers: { "Content-Type": "text/csv", "Accept-Language": language, Cookie: cookie },
        body: csv,
      })
      return ((await response.json()) as { annotatedCsv: string }).annotatedCsv.split("\r\n")
    }
    const original = csv.split("\r\n")

    const first = await send("cs")
    // Every original row is untouched; only the result is added at the end of it.
    first.forEach((line, index) => expect(line.startsWith(original[index])).toBe(true))
    expect(first[0]).toBe(`${original[0]};Výsledek párování`)
    expect(first[1]).toBe(
      `${original[1]};Spárováno: přihláška č. ${confirmedNumber}, termín ${firstTerm.number}`,
    )
    expect(first[2]).toBe(`${original[2]};Nespárováno: chybí variabilní symbol`)
    expect(first[3]).toBe(`${original[3]};Přeskočeno: odchozí platba`)
    expect(first[4]).toBe(
      `${original[4]};Spárováno: přihláška č. ${confirmedNumber}, souhrnná platba`,
    )

    expect(first.join("\n")).not.toContain("Bank Test")

    // The same file again: the rows paid before are not counted twice, and the copy says so.
    const second = await send("en")
    expect(second[0]).toBe(`${original[0]};Matching result`)
    expect(second[1]).toBe(`${original[1]};Skipped: already imported earlier`)
    expect(second[2]).toBe(`${original[2]};Unmatched: no variable symbol`)
    expect(second[3]).toBe(`${original[3]};Skipped: outgoing transaction`)
  })

  describe("summary variable symbol (US-148)", () => {
    type Status = "CONFIRMED" | "WAITLISTED" | "ARCHIVED"
    let participantId: string

    /** An application of the participant account with the first terms of the event in these states. */
    const createSummaryApplication = async (
      statuses: Status[],
    ): Promise<{ number: number; email: string; termNumbers: number[] }> => {
      const event = await prisma.event.findUniqueOrThrow({
        where: { id: eventId },
        include: { terms: { orderBy: { startsOn: "asc" } } },
      })
      const email = `summary-${randomUUID()}@example.com`
      const application = await prisma.application.create({
        data: {
          organizationId: event.organizationId,
          eventId,
          userId: participantId,
          accessToken: `summary-test-${randomUUID()}`,
          firstName: "Summary",
          lastName: "Test",
          birthDate: new Date("2000-01-01"),
          gender: "FEMALE",
          email,
          consentAt: new Date(),
          terms: {
            create: statuses.map((status, index) => ({
              organizationId: event.organizationId,
              termId: event.terms[index].id,
              status,
              priceCzk: 1000 * (index + 1),
            })),
          },
        },
      })
      return {
        number: application.number,
        email,
        termNumbers: event.terms.slice(0, statuses.length).map((term) => term.number),
      }
    }

    const rowsOf = async (number: number): Promise<{ term: number; amountCzk: number }[]> => {
      const rows = await prisma.payment.findMany({
        where: { applicationTerm: { application: { number } } },
        include: { applicationTerm: { include: { term: { select: { number: true } } } } },
        orderBy: { applicationTerm: { term: { startsOn: "asc" } } },
      })
      return rows.map((row) => ({
        term: row.applicationTerm.term.number,
        amountCzk: row.amountCzk,
      }))
    }

    beforeAll(async () => {
      participantId = (
        await prisma.user.findUniqueOrThrow({ where: { email: "ucastnik@example.com" } })
      ).id
    })

    it("splits a payment over the terms from the oldest, as one receipt, with one e-mail and a notification per term", async () => {
      const application = await createSummaryApplication(["CONFIRMED", "CONFIRMED"])
      const vs = String(application.number * 1000)
      // 1000 + 2000 owed; 3500 pays both and leaves 500 as an overpayment of the last term (D-087).
      const response = await upload(statement(String(Date.now()), [[3500, vs]]))
      expect(await response.json()).toMatchObject({
        matchedCount: 1,
        matchedCzk: 3500,
        overpaidCount: 1,
        overpaidCzk: 500,
        unmatchedCount: 0,
      })
      expect(await rowsOf(application.number)).toEqual([
        { term: application.termNumbers[0], amountCzk: 1000 },
        { term: application.termNumbers[1], amountCzk: 2500 },
      ])
      const rows = await prisma.payment.findMany({
        where: { applicationTerm: { application: { number: application.number } } },
      })
      expect(new Set(rows.map((row) => row.receiptId)).size).toBe(1)
      expect(rows.every((row) => row.source === "BANK_IMPORT" && row.isSummary)).toBe(true)
      // E-mail no. 8 once for the application, naming both terms that were closed.
      expect(allEmailsTo(application.email)).toHaveLength(1)
      const notifications = await prisma.notification.findMany({
        where: {
          applicationId: (
            await prisma.application.findFirstOrThrow({
              where: { eventId, number: application.number },
            })
          ).id,
        },
      })
      expect(notifications).toHaveLength(2)
      expect(
        notifications.every((row) => row.type === "PAYMENT" && row.kind === "PAYMENT_RECORDED"),
      ).toBe(true)
    })

    it("keeps the shortfall on the latest term and counts the same upload once", async () => {
      const application = await createSummaryApplication(["CONFIRMED", "CONFIRMED"])
      const csv = statement(String(Date.now()), [[1500, String(application.number * 1000)]])
      expect(await (await upload(csv)).json()).toMatchObject({ matchedCount: 1, overpaidCount: 0 })
      expect(await rowsOf(application.number)).toEqual([
        { term: application.termNumbers[0], amountCzk: 1000 },
        { term: application.termNumbers[1], amountCzk: 500 },
      ])
      expect(allEmailsTo(application.email)).toHaveLength(1)
      expect(await (await upload(csv)).json()).toMatchObject({ matchedCount: 0, duplicateCount: 1 })
      expect(await rowsOf(application.number)).toHaveLength(2)
      expect(allEmailsTo(application.email)).toHaveLength(1)
    })

    it("records the whole amount as an overpayment of a waitlisted application and sends no e-mail", async () => {
      const application = await createSummaryApplication(["WAITLISTED"])
      const result = await (
        await upload(statement(String(Date.now()), [[800, String(application.number * 1000)]]))
      ).json()
      expect(result).toMatchObject({ matchedCount: 1, overpaidCount: 1, overpaidCzk: 800 })
      expect(await rowsOf(application.number)).toEqual([
        { term: application.termNumbers[0], amountCzk: 800 },
      ])
      expect(await hasSentNothingTo(application.email)).toBe(true)
    })

    it("stores a payment as unmatched when no term of the application can take it", async () => {
      const application = await createSummaryApplication(["ARCHIVED"])
      const result = await (
        await upload(statement(String(Date.now()), [[800, String(application.number * 1000)]]))
      ).json()
      expect(result).toMatchObject({ matchedCount: 0, unmatchedCount: 1, unmatchedCzk: 800 })
      expect(await rowsOf(application.number)).toEqual([])
      const unmatched = (await (
        await fetch(api(`/organizer/events/${eventId}/bank-transactions/unmatched`), {
          headers: { Cookie: cookie },
        })
      ).json()) as { transactions: { variableSymbol: string; reason: string }[] }
      expect(
        unmatched.transactions.find(
          (row) => row.variableSymbol === String(application.number * 1000),
        ),
      ).toMatchObject({ reason: "UNKNOWN_VARIABLE_SYMBOL" })
    })
  })

  it("rejects a file that is not a statement and a missing or foreign session", async () => {
    const invalid = await upload("hello")
    expect(invalid.status).toBe(400)
    expect(await invalid.json()).toMatchObject({ code: "BANK_STATEMENT_INVALID" })
    expect((await upload("x", "")).status).toBe(401)
    const foreign = await signIn("organizator2@example.com", "password2")
    expect((await upload("x", foreign)).status).toBe(403)
  })
})
