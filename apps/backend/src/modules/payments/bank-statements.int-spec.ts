import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

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

  const statement = (id: string, rows: [amount: number, vs: string][]): string =>
    [
      "ID operace;Datum;Objem;Měna;Protiúčet;Název protiúčtu;Kód banky;Název banky;KS;VS;SS;Poznámka;Zpráva pro příjemce;Typ",
      ...rows.map(
        ([amount, vs], index) =>
          `${id}${index};05.05.2026;${amount};CZK;1;Test Payer;800;CS;;${vs};;;;Platba`,
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
      [-50, String(vs)],
    ])
    const response = await upload(csv)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      matchedCount: 1,
      matchedCzk: 7000,
      overpaidCount: 1,
      overpaidCzk: 100,
      unmatchedCount: 3,
      duplicateCount: 0,
      ignoredCount: 1,
    })
    const rows = await prisma.payment.findMany({
      where: { applicationTerm: { application: { number: numbers.first } } },
    })
    expect(rows).toMatchObject([{ amountCzk: 7000, source: "BANK_IMPORT" }])

    const again = (await (await upload(csv)).json()) as ImportResult
    expect(again).toMatchObject({ matchedCount: 0, unmatchedCount: 0, duplicateCount: 4 })
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
      "TERM_NOT_PAYABLE",
      "UNKNOWN_VARIABLE_SYMBOL",
    ])
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
