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
  paymentDetails: { bankAccount: string; summary: { variableSymbol: string } } | null
  paymentStatus: string
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
})
