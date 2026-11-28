import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { variableSymbol } from "@/modules/applications/domain/variable-symbol"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

describe("payment overview API", () => {
  let prisma: PrismaService
  let cookie: string
  let eventId: string
  const get = (session = cookie, id = eventId, suffix = "") =>
    fetch(api(`/organizer/events/${id}/payments${suffix}`), { headers: { Cookie: session } })

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

  it("keeps a paid cancellation and refunds only its term despite debt elsewhere", async () => {
    const application = await prisma.application.findFirstOrThrow({
      where: { eventId, terms: { some: { status: "CONFIRMED" } } },
      include: { terms: { include: { term: true } } },
    })
    const first = application.terms.find((row) => row.status === "CONFIRMED")!
    const secondTerm = await prisma.term.findFirstOrThrow({
      where: { eventId, id: { not: first.termId } },
    })
    const second = await prisma.applicationTerm.upsert({
      where: { applicationId_termId: { applicationId: application.id, termId: secondTerm.id } },
      create: {
        applicationId: application.id,
        organizationId: application.organizationId,
        termId: secondTerm.id,
        status: "CONFIRMED",
        priceCzk: 9900,
      },
      update: { status: "CONFIRMED", priceCzk: 9900 },
    })
    await prisma.payment.deleteMany({ where: { applicationTermId: { in: [first.id, second.id] } } })
    await prisma.applicationTerm.update({ where: { id: first.id }, data: { priceCzk: 700 } })
    const write = (path: string, method: string, body: object) =>
      fetch(api(`/organizer/applications/${application.id}${path}`), {
        method,
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    const overpayments = async () => {
      const response = await fetch(api(`/organizer/events/${eventId}/payments/overpayments`), {
        headers: { Cookie: cookie },
      })
      expect(response.status).toBe(200)
      return (await response.json()) as {
        applicationId: string
        termId: string
        status: string
        amountCzk: number
        variableSymbol: string
      }[]
    }
    const forApplication = async () =>
      (await overpayments()).filter((row) => row.applicationId === application.id)

    expect(
      (
        await write("/payments", "POST", {
          requestId: randomUUID(),
          termId: first.termId,
          amountCzk: 700,
        })
      ).status,
    ).toBe(204)
    expect(await forApplication()).toHaveLength(0)
    expect(
      (await write(`/terms/${first.termId}/status`, "PATCH", { status: "CANCELLED" })).ok,
    ).toBe(true)
    expect(await forApplication()).toEqual([
      expect.objectContaining({
        termId: first.termId,
        status: "CANCELLED",
        amountCzk: 700,
        variableSymbol: variableSymbol(application.number, first.term.number),
      }),
    ])
    const cancelledPaymentId = randomUUID()
    expect(
      (
        await write("/payments", "POST", {
          requestId: cancelledPaymentId,
          termId: first.termId,
          amountCzk: 200,
        })
      ).status,
    ).toBe(204)
    expect(await forApplication()).toEqual([expect.objectContaining({ amountCzk: 900 })])
    const cancelledPayment = await fetch(
      api(`/organizer/applications/${application.id}/payments/${cancelledPaymentId}`),
      { method: "DELETE", headers: { Cookie: cookie } },
    )
    expect(cancelledPayment.status).toBe(204)
    expect(await forApplication()).toEqual([expect.objectContaining({ amountCzk: 700 })])

    const otherDebt = (await (await get()).json()).entries.find(
      (entry: { applicationId: string; termId: string }) =>
        entry.applicationId === application.id && entry.termId === secondTerm.id,
    )
    expect(otherDebt.amountOwedCzk).toBe(9900)
    const refund = (amountCzk: number) =>
      write("/payments/refunds", "POST", {
        requestId: randomUUID(),
        termId: first.termId,
        amountCzk,
      })
    expect((await refund(250)).status).toBe(204)
    expect(await forApplication()).toEqual([
      expect.objectContaining({ termId: first.termId, amountCzk: 450 }),
    ])
    expect((await refund(450)).status).toBe(204)
    expect(await forApplication()).toHaveLength(0)
    const detail = await fetch(api(`/organizer/applications/${application.id}/payments`), {
      headers: { Cookie: cookie },
    })
    expect(detail.status).toBe(200)
    expect((await detail.json()).payments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ amountCzk: -250 }),
        expect.objectContaining({ amountCzk: -450 }),
      ]),
    )
  })

  it.each(["", "/overpayments"])(
    "requires an organizer with access to /payments%s",
    async (suffix) => {
      expect((await get("", eventId, suffix)).status).toBe(401)
      const participant = await signIn("ucastnik@example.com", "password4")
      expect((await get(participant, eventId, suffix)).status).toBe(403)
      const foreign = await prisma.event.findUniqueOrThrow({
        where: { publicToken: "demo-horsky-vikend-2027" },
      })
      const response = await get(cookie, foreign.id, suffix)
      expect(response.status).toBe(403)
      expect(await response.text()).not.toContain(foreign.name)
    },
  )
})
