// US-54: the participant sees only the applications of their own account.
import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type TermDto = { status: string; priceCzk: number }
type ApplicationDto = {
  id: string
  eventName: string
  firstName: string
  code: string
  variableSymbol: string
  terms: TermDto[]
  amountDueCzk: number
  amountPaidCzk: number
  amountOwedCzk: number
  paymentDetails: {
    bankAccount: string
    summary: { variableSymbol: string }
    terms: {
      termId: string
      variableSymbol: string
      owedCzk: number
      paymentStatus: string
      paymentDeadline: string | null
    }[]
  } | null
  paymentStatus: string
  canSimulatePayment: boolean
  simulatedPayments: { termId: string; amountCzk: number }[]
  organizationContact: { name: string; email: string | null; phone: string | null }
}

describe("participant applications (integration)", () => {
  let prisma: PrismaService

  const get = (path: string, cookie?: string): Promise<Response> =>
    fetch(api(path), cookie ? { headers: { Cookie: cookie } } : undefined)

  const listOf = async (cookie: string): Promise<ApplicationDto[]> =>
    (await get("/participant/applications", cookie)).json()

  /** A participant with one application in the seeded summer camp (both terms confirmed), paid as given. */
  const addApplication = async (email: string, payments: number[]): Promise<{ id: string }> => {
    const organizer = await prisma.user.findUniqueOrThrow({
      where: { email: "organizator@example.com" },
    })
    const event = await prisma.event.findFirstOrThrow({
      where: { publicToken: "demo-letni-kemp-2027" },
      include: { terms: { orderBy: { startsOn: "asc" } } },
    })
    const user =
      (await prisma.user.findUnique({ where: { email } })) ??
      (await prisma.user.create({
        data: {
          id: `user-${email}`,
          name: email,
          email,
          emailVerified: true,
          accountType: "PARTICIPANT",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }))
    const application = await prisma.application.create({
      data: {
        organizationId: event.organizationId,
        eventId: event.id,
        userId: user.id,
        accessToken: `token-${email}-${payments.join("-")}-${Math.random()}`,
        firstName: "Test",
        lastName: email,
        birthDate: new Date("2000-01-01"),
        gender: "MALE",
        email,
        consentAt: new Date(),
        terms: {
          create: event.terms.map((term) => ({
            organizationId: event.organizationId,
            termId: term.id,
            status: "CONFIRMED" as const,
            priceCzk: term.priceCzk,
          })),
        },
      },
      include: { terms: true },
    })
    // Each amount is a receipt on the first term; the application summary adds them up.
    await prisma.payment.createMany({
      data: payments.map((amountCzk) => ({
        organizationId: event.organizationId,
        applicationTermId: application.terms[0].id,
        receiptId: randomUUID(),
        amountCzk,
        recordedById: organizer.id,
      })),
    })
    return application
  }

  /** These accounts have no password; sign in as the participant through a session row instead. */
  const sessionCookie = async (email: string): Promise<string> => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } })
    const token = `session-${email}`
    await prisma.session.upsert({
      where: { token },
      update: {},
      create: {
        id: `s-${email}`,
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 3_600_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    const { createHmac } = await import("node:crypto")
    const signature = encodeURIComponent(
      createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "")
        .update(token)
        .digest("base64"),
    )
    return `better-auth.session_token=${token}.${signature}`
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    // The first request on a connection left over from the previous spec file can be reset.
    await fetch(api("/health")).catch(() => fetch(api("/health")))
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("lists all applications under one account, each with its own variable symbol", async () => {
    const cookie = await signIn("ucastnik@example.com", "password4")

    const applications = await listOf(cookie)

    expect(applications).toHaveLength(3)
    expect(applications.map((a) => a.eventName).sort()).toEqual([
      "Horský víkend 2027",
      "Letní kemp 2027",
      "Podzimní soustředění 2027",
    ])
    const symbols = applications.map((a) => a.variableSymbol)
    expect(new Set(symbols).size).toBe(3)
    // Summary symbol = application number × 1000; the display code carries the padded number.
    expect(symbols.every((symbol) => /^\d+000$/.test(symbol))).toBe(true)
    expect(
      applications.every((a) =>
        a.code.endsWith(`-${String(Number(a.variableSymbol) / 1000).padStart(4, "0")}`),
      ),
    ).toBe(true)
  })

  it("shows payment details and the amount due of a fully paid application", async () => {
    const applications = await listOf(await signIn("ucastnik@example.com", "password4"))

    const camp = applications.find((a) => a.eventName === "Letní kemp 2027")!

    expect(camp.terms.map((t) => t.status)).toEqual(["CONFIRMED", "CONFIRMED"])
    expect(camp).toMatchObject({
      amountDueCzk: 9400,
      amountPaidCzk: 9400,
      amountOwedCzk: 0,
      paymentStatus: "PAID",
    })
    expect(camp.paymentDetails).toMatchObject({
      bankAccount: "2900123456/2010",
      summary: { variableSymbol: camp.variableSymbol, payableCzk: 0 },
    })
  })

  it("gives every confirmed term of every application its own variable symbol (US-41)", async () => {
    await addApplication("vs-one@example.com", [])
    await addApplication("vs-two@example.com", [])
    const all = [
      ...(await listOf(await signIn("ucastnik@example.com", "password4"))),
      ...(await listOf(await sessionCookie("vs-one@example.com"))),
      ...(await listOf(await sessionCookie("vs-two@example.com"))),
    ]
    const symbols = all.flatMap((a) => a.paymentDetails?.terms.map((t) => t.variableSymbol) ?? [])

    expect(symbols.length).toBeGreaterThan(2)
    expect(new Set(symbols).size).toBe(symbols.length)
  })

  it.each([
    ["paid", "dl-paid@example.com", [4500], "PAID", 0],
    ["overpaid", "dl-over@example.com", [5000], "OVERPAID", -500],
  ])(
    "shows the due date of the unpaid term and none for the %s one (US-41)",
    async (_name, email, payments, firstStatus, firstOwed) => {
      await addApplication(email, payments)
      const [application] = await listOf(await sessionCookie(email))

      const [first, second] = application.paymentDetails!.terms
      expect(first).toMatchObject({ paymentStatus: firstStatus, owedCzk: firstOwed })
      expect(first.paymentDeadline).toBeNull()
      expect(second).toMatchObject({ paymentStatus: "UNPAID", owedCzk: 4900 })
      expect(Number.isNaN(Date.parse(second.paymentDeadline!))).toBe(false)
    },
  )

  it("shows what is left to pay of a partly paid application", async () => {
    const applications = await listOf(await signIn("ucastnik@example.com", "password4"))

    const partly = applications.find((a) => a.firstName === "Petr")!

    expect(partly).toMatchObject({
      amountDueCzk: 2400,
      amountPaidCzk: 1000,
      amountOwedCzk: 1400,
      paymentStatus: "PARTIALLY_PAID",
    })
    expect(partly.paymentDetails).not.toBeNull()
  })

  it("shows no payment details when the application is waitlisted in every term", async () => {
    const applications = await listOf(await signIn("ucastnik@example.com", "password4"))

    const weekend = applications.find((a) => a.eventName === "Horský víkend 2027")!

    expect(weekend.terms).toHaveLength(1)
    expect(weekend.terms[0]).toMatchObject({ status: "WAITLISTED" })
    expect(weekend.terms[0]).not.toHaveProperty("waitlistPosition")
    expect(weekend.paymentStatus).toBe("NOTHING_DUE")
    expect(weekend).toMatchObject({ amountDueCzk: 0, amountPaidCzk: 0, amountOwedCzk: 0 })
    expect(weekend.paymentDetails).toBeNull()
  })

  it.each([
    ["nothing paid", "unpaid@example.com", [], 0, 9400],
    ["partly paid", "partly@example.com", [2000], 2000, 7400],
    ["paid in full", "full@example.com", [4000, 5400], 9400, 0],
    ["overpaid", "over@example.com", [10000], 10000, -600],
  ])("computes what is paid and owed: %s", async (_name, email, payments, paid, owed) => {
    await addApplication(email, payments)
    // These accounts have no password; sign in as the participant through a session row instead.
    const user = await prisma.user.findUniqueOrThrow({ where: { email } })
    const token = `session-${email}`
    await prisma.session.create({
      data: {
        id: `s-${email}`,
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 3_600_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    const { createHmac } = await import("node:crypto")
    const signature = encodeURIComponent(
      createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "")
        .update(token)
        .digest("base64"),
    )
    const cookie = `better-auth.session_token=${token}.${signature}`

    const [application] = await listOf(cookie)

    expect(application).toMatchObject({
      amountDueCzk: 9400,
      amountPaidCzk: paid,
      amountOwedCzk: owed,
    })
  })

  it("shows the organization contact of the event in the list and in the detail (US-121)", async () => {
    const cookie = await signIn("ucastnik@example.com", "password4")
    const camp = (await listOf(cookie)).find((a) => a.eventName === "Letní kemp 2027")!

    const detail: ApplicationDto = await (
      await get(`/participant/applications/${camp.id}`, cookie)
    ).json()

    const contact = {
      name: "Letní kemp z. s.",
      email: "info@letni-kemp.example",
      phone: "+420 777 000 003",
    }
    expect(camp.organizationContact).toEqual(contact)
    expect(detail.organizationContact).toEqual(contact)
  })

  it("returns just the organization name when the event has no contact (D-092)", async () => {
    const cookie = await signIn("ucastnik@example.com", "password4")
    const where = { publicToken: "demo-podzimni-soustredeni-2027" }
    const event = await prisma.event.findFirstOrThrow({ where })
    await prisma.event.update({
      where: { id: event.id },
      data: { contactEmail: null, contactPhone: null },
    })

    try {
      const autumn = (await listOf(cookie)).find(
        (a) => a.eventName === "Podzimní soustředění 2027",
      )!

      expect(autumn.organizationContact).toEqual({
        name: "Horský spolek Sněžka",
        email: null,
        phone: null,
      })
    } finally {
      await prisma.event.update({
        where: { id: event.id },
        data: { contactEmail: event.contactEmail, contactPhone: event.contactPhone },
      })
    }
  })

  it("never returns an application of someone else", async () => {
    const cookie = await signIn("ucastnik@example.com", "password4")
    const foreign = await prisma.application.findFirstOrThrow({
      where: { email: "tomas.dvorak@example.com" },
    })

    const list = await listOf(cookie)
    const detail = await get(`/participant/applications/${foreign.id}`, cookie)

    expect(list.some((a) => a.id === foreign.id)).toBe(false)
    expect(list.every((a) => a.firstName === "Jana" || a.firstName === "Petr")).toBe(true)
    expect(detail.status).toBe(403)
    expect(await detail.text()).not.toContain("Tomáš")
  })

  it("returns one own application by id", async () => {
    const cookie = await signIn("ucastnik@example.com", "password4")
    const [first] = await listOf(cookie)

    const response = await get(`/participant/applications/${first.id}`, cookie)

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ id: first.id })
  })

  it("does not leak the access token", async () => {
    const cookie = await signIn("ucastnik@example.com", "password4")

    const body = await (await get("/participant/applications", cookie)).text()

    expect(body).not.toContain("accessToken")
  })

  it("answers 401 without a session", async () => {
    expect((await get("/participant/applications")).status).toBe(401)
  })

  it("answers 403 to an organizer", async () => {
    const cookie = await signIn("organizator@example.com", "password1")

    expect((await get("/participant/applications", cookie)).status).toBe(403)
  })

  describe("payment simulation (US-115)", () => {
    const simulate = (applicationId: string, termId: string, cookie?: string): Promise<Response> =>
      fetch(api(`/participant/applications/${applicationId}/payments/simulation`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
        body: JSON.stringify({ termId }),
      })

    it("settles the debt of one term with a payment of source simulation", async () => {
      const email = "simulation@example.com"
      const { id } = await addApplication(email, [])
      const cookie = await sessionCookie(email)
      const before = (await listOf(cookie))[0]
      const [first, second] = before.paymentDetails!.terms

      expect(before).toMatchObject({ canSimulatePayment: true, simulatedPayments: [] })
      expect((await simulate(id, first.termId, cookie)).status).toBe(204)

      const after = (await listOf(cookie))[0]
      expect(after.paymentDetails!.terms.find((t) => t.termId === first.termId)?.owedCzk).toBe(0)
      expect(after.paymentDetails!.terms.find((t) => t.termId === second.termId)?.owedCzk).toBe(
        second.owedCzk,
      )
      expect(after.simulatedPayments).toEqual([
        expect.objectContaining({ termId: first.termId, amountCzk: first.owedCzk }),
      ])
      const rows = await prisma.payment.findMany({
        where: { applicationTerm: { applicationId: id } },
      })
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ source: "SIMULATION", amountCzk: first.owedCzk })
    })

    it("refuses a term that has nothing left to pay", async () => {
      const email = "simulation-paid@example.com"
      const { id } = await addApplication(email, [])
      const cookie = await sessionCookie(email)
      const [first] = (await listOf(cookie))[0].paymentDetails!.terms
      expect((await simulate(id, first.termId, cookie)).status).toBe(204)

      expect((await simulate(id, first.termId, cookie)).status).toBe(400)
    })

    it("refuses someone else's application, an organizer and a missing session", async () => {
      const { id } = await addApplication("simulation-owner@example.com", [])
      await addApplication("simulation-other@example.com", [])
      const other = await sessionCookie("simulation-other@example.com")
      const term = await prisma.applicationTerm.findFirstOrThrow({ where: { applicationId: id } })

      expect((await simulate(id, term.termId, other)).status).toBe(403)
      const organizer = await signIn("organizator@example.com", "password1")
      expect((await simulate(id, term.termId, organizer)).status).toBe(403)
      expect((await simulate(id, term.termId)).status).toBe(401)
      expect(
        await prisma.payment.count({ where: { applicationTerm: { applicationId: id } } }),
      ).toBe(0)
    })
  })
})
