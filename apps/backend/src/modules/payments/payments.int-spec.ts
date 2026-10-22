import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type Summary = {
  amountDueCzk: number
  amountPaidCzk: number
  amountOwedCzk: number
  payments: { id: string; amountCzk: number; recordedByName: string }[]
}

describe("organizer payments (US-44)", () => {
  let prisma: PrismaService
  let cookie: string
  let participantCookie: string
  let foreignCookie: string
  let applicationId: string
  let organizerId: string

  const request = (
    method: string,
    suffix = "",
    body?: unknown,
    auth: string | undefined = cookie,
    id = applicationId,
  ): Promise<Response> =>
    fetch(api(`/organizer/applications/${id}/payments${suffix}`), {
      method,
      headers: {
        ...(auth ? { Cookie: auth } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  const summary = async (): Promise<Summary> => (await request("GET")).json()

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    foreignCookie = await signIn("organizator2@example.com", "password2")
    participantCookie = await signIn("ucastnik@example.com", "password4")
    organizerId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "organizator@example.com" } })
    ).id
  })
  afterAll(async () => {
    await prisma?.$disconnect()
  })

  beforeEach(async () => {
    const event = await prisma.event.findUniqueOrThrow({
      where: { publicToken: "demo-letni-kemp-2027" },
      include: { terms: { orderBy: { startsOn: "asc" } } },
    })
    const application = await prisma.application.create({
      data: {
        organizationId: event.organizationId,
        eventId: event.id,
        accessToken: `payment-test-${Date.now()}-${Math.random()}`,
        firstName: "Payment",
        lastName: "Test",
        birthDate: new Date("2000-01-01"),
        gender: "FEMALE",
        email: "payment-test@example.com",
        consentAt: new Date(),
        terms: {
          create: event.terms.slice(0, 2).map((term, index) => ({
            organizationId: event.organizationId,
            termId: term.id,
            status: index === 0 ? "CONFIRMED" : "WAITLISTED",
            priceCzk: index === 0 ? 6900 : 9900,
          })),
        },
      },
    })
    applicationId = application.id
  })

  it("records the full frozen confirmed price when amount is omitted, with the session's author", async () => {
    expect((await request("POST", "", {})).status).toBe(204)
    expect(await summary()).toMatchObject({
      amountDueCzk: 6900,
      amountPaidCzk: 6900,
      amountOwedCzk: 0,
    })
    const payment = await prisma.payment.findFirstOrThrow({ where: { applicationId } })
    expect(payment.recordedById).toBe(organizerId)
  })

  it("records partial payment, corrects it and restores the debt on cancellation", async () => {
    expect((await request("POST", "", { amountCzk: 3000 })).status).toBe(204)
    const partial = await summary()
    expect(partial).toMatchObject({ amountPaidCzk: 3000, amountOwedCzk: 3900 })
    const suffix = `/${partial.payments[0].id}`
    expect((await request("PATCH", suffix, { amountCzk: 2000 })).status).toBe(204)
    expect(await summary()).toMatchObject({ amountPaidCzk: 2000, amountOwedCzk: 4900 })
    expect((await request("DELETE", suffix)).status).toBe(204)
    expect(await summary()).toMatchObject({ payments: [], amountPaidCzk: 0, amountOwedCzk: 6900 })
  })

  it("keeps an overpayment visible as negative debt and accepts explicit zero", async () => {
    await request("POST", "", { amountCzk: 7000 })
    const result = await summary()
    expect(result.amountOwedCzk).toBe(-100)
    await request("PATCH", `/${result.payments[0].id}`, { amountCzk: 0 })
    expect(await summary()).toMatchObject({ amountPaidCzk: 0, amountOwedCzk: 6900 })
  })

  it("serializes simultaneous submissions so a double click cannot record two payments", async () => {
    const results = await Promise.all([request("POST", "", {}), request("POST", "", {})])
    expect(results.map((r) => r.status).sort()).toEqual([204, 409])
    expect((await summary()).payments).toHaveLength(1)
  })

  it.each([-1, 0.5, 2147483648, "3000", null])("rejects invalid amount %s", async (amountCzk) => {
    expect((await request("POST", "", { amountCzk })).status).toBe(400)
    expect((await summary()).payments).toHaveLength(0)
  })

  it("rejects supplied author fields", async () => {
    expect((await request("POST", "", { amountCzk: 3000, recordedById: "other" })).status).toBe(400)
  })

  it("protects reads and mutations from anonymous users, participants and foreign organizers", async () => {
    await request("POST", "", {})
    const payment = (await summary()).payments[0]
    for (const [auth, status] of [
      ["", 401],
      [participantCookie, 403],
      [foreignCookie, 403],
    ] as const) {
      for (const [method, suffix, body] of [
        ["GET", "", undefined],
        ["POST", "", {}],
        ["PATCH", `/${payment.id}`, {}],
        ["DELETE", `/${payment.id}`, undefined],
      ] as const) {
        const response = await request(method, suffix, body, auth)
        expect(response.status).toBe(status)
        if (status === 403)
          expect(await response.json()).toEqual({
            statusCode: 403,
            code: "FORBIDDEN",
            message: "Forbidden",
          })
      }
    }
    expect((await summary()).amountPaidCzk).toBe(6900)
  })

  it("does not modify a payment through a different application or unknown id", async () => {
    await request("POST", "", {})
    const payment = (await summary()).payments[0]
    const other = await prisma.application.findFirstOrThrow({
      where: {
        id: { not: applicationId },
        organization: { members: { some: { userId: organizerId } } },
      },
    })
    expect(
      (await request("PATCH", `/${payment.id}`, { amountCzk: 1 }, cookie, other.id)).status,
    ).toBe(403)
    expect((await request("DELETE", `/${payment.id}`, undefined, cookie, other.id)).status).toBe(
      403,
    )
    expect((await request("GET", "", undefined, cookie, "missing")).status).toBe(403)
    expect((await summary()).amountPaidCzk).toBe(6900)
  })
})
