import { randomUUID } from "node:crypto"
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
    body?: Record<string, unknown>,
    auth: string | undefined = cookie,
    id = applicationId,
  ): Promise<Response> =>
    fetch(api(`/organizer/applications/${id}/payments${suffix}`), {
      method,
      headers: {
        ...(auth ? { Cookie: auth } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body:
        body === undefined
          ? undefined
          : JSON.stringify(method === "POST" ? { requestId: randomUUID(), ...body } : body),
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

  it("keeps each instalment in history and cancels only the selected receipt", async () => {
    expect((await request("POST", "", { amountCzk: 3000 })).status).toBe(204)
    const partial = await summary()
    expect(partial).toMatchObject({ amountPaidCzk: 3000, amountOwedCzk: 3900 })
    expect((await request("POST", "", { amountCzk: 1000 })).status).toBe(204)
    const result = await summary()
    expect(result).toMatchObject({ amountPaidCzk: 4000, amountOwedCzk: 2900 })
    expect(result.payments.map((p) => p.amountCzk)).toEqual([3000, 1000])
    expect((await request("DELETE", `/${result.payments[1].id}`)).status).toBe(204)
    const cancelled = await summary()
    expect(cancelled).toMatchObject({ amountPaidCzk: 3000, amountOwedCzk: 3900 })
    expect(cancelled.payments).toEqual(partial.payments)
  })

  it("settles only the remaining balance when the next receipt has no amount", async () => {
    await request("POST", "", { amountCzk: 3000 })
    expect((await request("POST", "", {})).status).toBe(204)
    const result = await summary()
    expect(result).toMatchObject({ amountPaidCzk: 6900, amountOwedCzk: 0 })
    expect(result.payments.map((p) => p.amountCzk)).toEqual([3000, 3900])
    expect((await request("POST", "", {})).status).toBe(400)
    expect((await summary()).payments).toHaveLength(2)
  })

  it.each([undefined, 3000])(
    "does not restore a cancelled payment on retry (%s)",
    async (amountCzk) => {
      const requestId = randomUUID()
      expect((await request("POST", "", { requestId, amountCzk })).status).toBe(204)
      expect((await request("DELETE", `/${requestId}`)).status).toBe(204)
      // A lost response can be retried after another organizer has cancelled the entry.
      expect((await request("POST", "", { requestId, amountCzk })).status).toBe(204)
      expect(await summary()).toMatchObject({ amountPaidCzk: 0, amountOwedCzk: 6900, payments: [] })
      expect((await request("POST", "", { requestId, amountCzk: 1000 })).status).toBe(409)
      expect((await request("DELETE", `/${requestId}`)).status).toBe(403)
      expect(
        (await prisma.payment.findUniqueOrThrow({ where: { id: requestId } })).cancelledAt,
      ).not.toBeNull()
      // A genuinely new submission still settles the full remaining balance.
      expect((await request("POST", "", {})).status).toBe(204)
      expect((await summary()).amountPaidCzk).toBe(6900)
    },
  )

  it("does not restore a cancelled refund on retry or count it against a new refund", async () => {
    await request("POST", "", { amountCzk: 7400 })
    const requestId = randomUUID()
    expect((await request("POST", "/refunds", { requestId, amountCzk: 500 })).status).toBe(204)
    expect((await request("DELETE", `/${requestId}`)).status).toBe(204)
    expect((await request("POST", "/refunds", { requestId, amountCzk: 500 })).status).toBe(204)
    expect(await summary()).toMatchObject({ amountPaidCzk: 7400, amountOwedCzk: -500 })
    expect((await summary()).payments).toHaveLength(1)
    expect((await request("POST", "/refunds", { requestId, amountCzk: 200 })).status).toBe(409)
    expect((await request("POST", "", { requestId, amountCzk: 500 })).status).toBe(409)
    expect((await request("POST", "/refunds", { amountCzk: 500 })).status).toBe(204)
    expect((await summary()).amountOwedCzk).toBe(0)
  })

  it("excludes cancelled payments from the participant list and detail", async () => {
    const participant = await prisma.user.findUniqueOrThrow({
      where: { email: "ucastnik@example.com" },
    })
    await prisma.application.update({
      where: { id: applicationId },
      data: { userId: participant.id },
    })
    const requestId = randomUUID()
    await request("POST", "", { requestId, amountCzk: 3000 })
    await request("POST", "", { amountCzk: 1000 })
    expect((await request("DELETE", `/${requestId}`)).status).toBe(204)
    for (const suffix of ["", `/${applicationId}`]) {
      const response = await fetch(api(`/participant/applications${suffix}`), {
        headers: { Cookie: participantCookie },
      })
      expect(response.status).toBe(200)
      const body = await response.json()
      const application = suffix
        ? body
        : body.find((row: { id: string }) => row.id === applicationId)
      expect(application).toMatchObject({ amountPaidCzk: 1000, amountOwedCzk: 5900 })
    }
  })

  it("keeps an overpayment visible as negative debt, including additional receipts", async () => {
    await request("POST", "", { amountCzk: 7000 })
    const result = await summary()
    expect(result.amountOwedCzk).toBe(-100)
    await request("POST", "", { amountCzk: 200 })
    expect(await summary()).toMatchObject({ amountPaidCzk: 7200, amountOwedCzk: -300 })
    expect((await summary()).payments).toHaveLength(2)
  })

  it("serializes simultaneous submissions so a double click cannot record two payments", async () => {
    const requestId = randomUUID()
    const results = await Promise.all([
      request("POST", "", { requestId }),
      request("POST", "", { requestId }),
    ])
    expect(results.map((r) => r.status)).toEqual([204, 204])
    expect((await summary()).payments).toHaveLength(1)
  })

  it("records partial and full refunds independently and allows cancelling a mistaken refund", async () => {
    await request("POST", "", { amountCzk: 7400 })
    const requestId = randomUUID()
    expect((await request("POST", "/refunds", { requestId, amountCzk: 200 })).status).toBe(204)
    expect((await request("POST", "/refunds", { requestId, amountCzk: 200 })).status).toBe(204)
    expect((await request("POST", "/refunds", { requestId, amountCzk: 300 })).status).toBe(409)
    expect(await summary()).toMatchObject({ amountPaidCzk: 7200, amountOwedCzk: -300 })
    expect((await request("POST", "/refunds", { amountCzk: 300 })).status).toBe(204)
    const result = await summary()
    expect(result).toMatchObject({ amountPaidCzk: 6900, amountOwedCzk: 0 })
    expect(result.payments.map((p) => p.amountCzk)).toEqual([7400, -200, -300])
    expect(
      (await prisma.payment.findUniqueOrThrow({ where: { id: requestId } })).recordedById,
    ).toBe(organizerId)
    expect((await request("DELETE", `/${requestId}`)).status).toBe(204)
    expect((await summary()).amountOwedCzk).toBe(-200)
  })

  it("serializes refunds so concurrent requests cannot exceed the overpayment", async () => {
    await request("POST", "", { amountCzk: 7400 })
    const responses = await Promise.all([
      request("POST", "/refunds", { amountCzk: 300 }),
      request("POST", "/refunds", { amountCzk: 300 }),
    ])
    expect(responses.map((r) => r.status).sort()).toEqual([204, 409])
    expect((await summary()).amountOwedCzk).toBe(-200)
  })

  it.each([undefined, null, 0, -1, 0.5, 501, "200"])(
    "rejects invalid or excessive refund %s",
    async (amountCzk) => {
      await request("POST", "", { amountCzk: 7400 })
      const response = await request("POST", "/refunds", { amountCzk })
      expect(response.status).toBe(amountCzk === 501 ? 409 : 400)
      expect((await summary()).payments).toHaveLength(1)
    },
  )

  it("rejects refunds without an overpayment and receipt UUID reuse as a refund", async () => {
    expect((await request("POST", "/refunds", { amountCzk: 1 })).status).toBe(409)
    const requestId = randomUUID()
    await request("POST", "", { requestId, amountCzk: 7400 })
    expect((await request("POST", "/refunds", { requestId, amountCzk: 7400 })).status).toBe(409)
  })

  it("keeps independent concurrent payments even when their amounts match", async () => {
    const results = await Promise.all([
      request("POST", "", { amountCzk: 3000 }),
      request("POST", "", { amountCzk: 3000 }),
    ])
    expect(results.map((r) => r.status)).toEqual([204, 204])
    expect((await summary()).payments).toHaveLength(2)
    expect((await summary()).amountPaidCzk).toBe(6000)
  })

  it("does not reuse a submission id to overwrite an earlier receipt", async () => {
    const requestId = randomUUID()
    await request("POST", "", { requestId, amountCzk: 3000 })
    expect((await request("POST", "", { requestId, amountCzk: 1000 })).status).toBe(409)
    expect((await summary()).amountPaidCzk).toBe(3000)
    expect((await summary()).payments).toHaveLength(1)
  })

  it.each([0, -1, 0.5, 2147483648, "3000", null])(
    "rejects invalid amount %s",
    async (amountCzk) => {
      expect((await request("POST", "", { amountCzk })).status).toBe(400)
      expect((await summary()).payments).toHaveLength(0)
    },
  )

  it.each([undefined, null, "not-a-uuid"])(
    "rejects missing or invalid submission id %s",
    async (requestId) => {
      expect((await request("POST", "", { requestId, amountCzk: 3000 })).status).toBe(400)
    },
  )

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
        ["POST", "/refunds", { amountCzk: 100 }],
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
    expect((await request("DELETE", `/${payment.id}`, undefined, cookie, other.id)).status).toBe(
      403,
    )
    expect((await request("GET", "", undefined, cookie, "missing")).status).toBe(403)
    expect((await summary()).amountPaidCzk).toBe(6900)
  })
})
