import { PrismaService } from "@/core/prisma/prisma.service"
import { variableSymbol } from "@/modules/applications/domain/variable-symbol"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

describe("payment overview API", () => {
  let prisma: PrismaService
  let cookie: string
  let eventId: string
  const get = (session = cookie, id = eventId) =>
    fetch(api(`/organizer/events/${id}/payments`), { headers: { Cookie: session } })

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    eventId = (
      await prisma.event.findUniqueOrThrow({
        where: { publicToken: "demo-letni-kemp-2027" },
      })
    ).id
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("shows term debts and dates with an unfiltered total", async () => {
    const response = await get()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.entries.length).toBeGreaterThan(0)
    expect(
      body.entries.every(
        (entry: { reminderCount: number; lastReminderAt: string | null }) =>
          entry.reminderCount === 0 && entry.lastReminderAt === null,
      ),
    ).toBe(true)
    expect(body.entries[0].paymentDueAt).toBeTruthy()
    expect(body.entries[0].startsOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(body.entries[0].endsOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(body.totalDebtCzk).toBe(
      body.entries.reduce(
        (sum: number, entry: { amountOwedCzk: number }) => sum + Math.max(0, entry.amountOwedCzk),
        0,
      ),
    )
    expect(body.debtorCount).toBeGreaterThan(0)
  })

  it("reads a persisted sent reminder for indebted and paid terms", async () => {
    const terms = await prisma.applicationTerm.findMany({
      where: { status: "CONFIRMED", application: { eventId } },
      select: {
        id: true,
        applicationId: true,
        termId: true,
        priceCzk: true,
        payments: { where: { cancelledAt: null }, select: { amountCzk: true } },
      },
    })
    const debt = (term: (typeof terms)[number]) =>
      term.priceCzk - term.payments.reduce((sum, payment) => sum + payment.amountCzk, 0)
    const indebted = terms.find((term) => debt(term) > 0)!
    const paid = terms.find((term) => debt(term) <= 0)!
    expect(indebted).toBeDefined()
    expect(paid).toBeDefined()
    const sentAt = new Date("2026-11-06T10:00:00Z")
    await prisma.applicationTerm.updateMany({
      where: { id: { in: [indebted.id, paid.id] } },
      data: { paymentReminderSentAt: sentAt },
    })

    const response = await get()
    expect(response.status).toBe(200)
    const body = await response.json()
    const entryFor = (term: (typeof terms)[number]) =>
      body.entries.find(
        (entry: { applicationId: string; termId: string }) =>
          entry.applicationId === term.applicationId && entry.termId === term.termId,
      )
    expect(entryFor(indebted)).toMatchObject({
      reminderCount: 1,
      lastReminderAt: sentAt.toISOString(),
      amountOwedCzk: debt(indebted),
    })
    expect(entryFor(paid)).toMatchObject({
      reminderCount: 1,
      lastReminderAt: sentAt.toISOString(),
      amountOwedCzk: debt(paid),
    })
  })

  it("exposes the searchable term and summary symbols of a confirmed application", async () => {
    const source = await prisma.applicationTerm.findFirstOrThrow({
      where: { application: { eventId }, status: "CONFIRMED" },
      select: {
        application: { select: { id: true, number: true } },
        term: { select: { id: true, number: true } },
      },
    })
    const response = await get()
    expect(response.status).toBe(200)
    const { entries } = await response.json()
    const symbol = variableSymbol(source.application.number, source.term.number)
    const result = entries.filter(
      (entry: { variableSymbol: string }) => entry.variableSymbol === symbol,
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      applicationId: source.application.id,
      termId: source.term.id,
      summaryVariableSymbol: variableSymbol(source.application.number),
    })
  })

  it("requires an organizer with access to the event", async () => {
    expect((await get("")).status).toBe(401)
    expect((await get(await signIn("ucastnik@example.com", "password4"))).status).toBe(403)
    const foreign = await prisma.event.findUniqueOrThrow({
      where: { publicToken: "demo-horsky-vikend-2027" },
    })
    const response = await get(cookie, foreign.id)
    expect(response.status).toBe(403)
    expect(await response.text()).not.toContain(foreign.name)
  })
})
