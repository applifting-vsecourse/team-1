import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import {
  api,
  connectTestPrisma,
  latestEmailTo,
  resetAndSeed,
  signIn,
} from "@/test/integration/test-api"

type Summary = {
  bankAccount: string
  variableSymbol: string
  amountDueCzk: number
  amountPaidCzk: number
  amountOwedCzk: number
  payableCzk: number
  refundableTermId: string | null
  terms: {
    termId: string
    termNumber: number
    variableSymbol: string
    dueCzk: number
    paidCzk: number
    owedCzk: number
    paymentStatus: string
    paymentDueAt: string | null
    refundableCzk: number
  }[]
  payments: {
    id: string
    amountCzk: number
    recordedByName: string
    cancelledAt: string | null
    correctsReceiptId: string | null
    isSummary: boolean | null
    rows: { termId: string; amountCzk: number }[]
  }[]
}

describe("organizer payments (US-44)", () => {
  let prisma: PrismaService
  let cookie: string
  let participantCookie: string
  let foreignCookie: string
  let applicationId: string
  let applicationNumber: number
  /** Terms of the test application: the first is confirmed (6900), the second waitlisted (9900). */
  let termIds: string[]
  const firstTermId = (): string => termIds[0]
  let organizerId: string
  let applicantEmail: string

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
          : JSON.stringify(
              method === "POST" && !suffix.endsWith("/preview")
                ? { requestId: randomUUID(), ...body }
                : body,
            ),
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
    applicantEmail = `payment-${randomUUID()}@example.com`
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
        email: applicantEmail,
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
    applicationNumber = application.number
    termIds = event.terms.slice(0, 2).map((term) => term.id)
  })

  it("records the full frozen confirmed price when amount is omitted, with the session's author", async () => {
    expect((await request("POST", "", {})).status).toBe(204)
    expect(await summary()).toMatchObject({
      amountDueCzk: 6900,
      amountPaidCzk: 6900,
      amountOwedCzk: 0,
    })
    const payment = await prisma.payment.findFirstOrThrow({
      where: { applicationTerm: { applicationId } },
    })
    expect(payment.recordedById).toBe(organizerId)
  })

  it("replaces a paid receipt atomically, preserves the original and sends e-mail 16 once", async () => {
    await request("POST", "", { amountCzk: 6900, termId: firstTermId() })
    const paidTerm = await prisma.applicationTerm.findFirstOrThrow({
      where: { applicationId, termId: firstTermId() },
    })
    expect(paidTerm.paymentPeriodStartedAt).toBeNull()
    const [original] = (await summary()).payments
    const requestId = randomUUID()
    const correction = { requestId, amountCzk: 5000, termId: firstTermId() }
    const previewResponse = await request("POST", `/${original.id}/preview`, {
      amountCzk: 5000,
      termId: firstTermId(),
    })
    expect(previewResponse.status).toBe(200)
    const preview = (await previewResponse.json()) as {
      amountOwedCzk: number
      terms: { termId: string; owedCzk: number; changeCzk: number }[]
    }
    expect(preview).toMatchObject({
      amountOwedCzk: 1900,
      terms: expect.arrayContaining([{ termId: firstTermId(), owedCzk: 1900, changeCzk: 1900 }]),
    })
    expect((await summary()).amountPaidCzk).toBe(6900)
    expect(await latestEmailTo(applicantEmail, 0)).toBeUndefined()
    expect((await request("PATCH", `/${original.id}`, correction)).status).toBe(204)
    const after = await summary()
    expect(after).toMatchObject({ amountPaidCzk: 5000, amountOwedCzk: 1900 })
    expect(after.amountOwedCzk).toBe(preview.amountOwedCzk)
    expect(after.terms[0].paymentStatus).toBe("PARTIALLY_PAID")
    const restartedTerm = await prisma.applicationTerm.findFirstOrThrow({
      where: { applicationId, termId: firstTermId() },
    })
    expect(new Date(after.terms[0].paymentDueAt!).getTime()).toBe(
      restartedTerm.paymentPeriodStartedAt!.getTime() + 10 * 24 * 60 * 60 * 1000,
    )
    expect(
      (
        await prisma.applicationTerm.findFirstOrThrow({
          where: { applicationId, termId: firstTermId() },
        })
      ).paymentPeriodStartedAt?.getTime(),
    ).toBeGreaterThanOrEqual(paidTerm.evaluatedAt.getTime())
    expect(after.payments).toMatchObject([
      { id: original.id, amountCzk: 6900, correctsReceiptId: null },
      { id: requestId, amountCzk: 5000, correctsReceiptId: original.id },
    ])
    expect(after.payments[0].cancelledAt).not.toBeNull()
    expect(after.payments[1].cancelledAt).toBeNull()
    expect(
      (await prisma.payment.findMany({ where: { receiptId: original.id } })).every(
        (row) => row.cancelledAt !== null,
      ),
    ).toBe(true)
    expect((await latestEmailTo(applicantEmail))?.subject).toContain("Payment correction")
    expect((await request("PATCH", `/${original.id}`, correction)).status).toBe(204)
    expect((await summary()).payments).toHaveLength(2)
    expect((await summary()).terms[0].paymentDueAt).toBe(after.terms[0].paymentDueAt)
  })

  it("does not send a correction e-mail while the application already owed money", async () => {
    const previousStart = new Date("2026-01-01T12:00:00Z")
    await prisma.applicationTerm.updateMany({
      where: { applicationId, termId: firstTermId() },
      data: { paymentPeriodStartedAt: previousStart },
    })
    await request("POST", "", { amountCzk: 1000, termId: firstTermId() })
    const [original] = (await summary()).payments
    expect(
      (
        await request("PATCH", `/${original.id}`, {
          requestId: randomUUID(),
          amountCzk: 2000,
          termId: firstTermId(),
        })
      ).status,
    ).toBe(204)
    expect((await summary()).amountOwedCzk).toBe(4900)
    expect((await summary()).terms[0].paymentDueAt).toBe("2026-01-11T12:00:00.000Z")
    expect(await latestEmailTo(applicantEmail, 0)).toBeUndefined()
  })

  it("protects correction previews and rejects a missing receipt", async () => {
    await request("POST", "", { amountCzk: 500, termId: firstTermId() })
    const [original] = (await summary()).payments
    const suffix = `/${original.id}/preview`
    const input = { amountCzk: 700, termId: firstTermId() }
    expect((await request("POST", suffix, input, foreignCookie)).status).toBe(403)
    expect((await request("POST", suffix, input, participantCookie)).status).toBe(403)
    expect((await request("POST", suffix, input, "")).status).toBe(401)
    expect((await request("POST", `/${randomUUID()}/preview`, input)).status).toBe(403)
  })

  it("replaces all rows of a summary receipt and allocates the new amount again", async () => {
    await prisma.applicationTerm.updateMany({
      where: { applicationId, termId: termIds[1] },
      data: { status: "CONFIRMED" },
    })
    await request("POST", "", { amountCzk: 10000 })
    const [original] = (await summary()).payments
    expect(original.rows).toHaveLength(2)
    const newId = randomUUID()
    expect(
      (await request("PATCH", `/${original.id}`, { requestId: newId, amountCzk: 16000 })).status,
    ).toBe(204)
    const after = await summary()
    expect(after.payments).toHaveLength(2)
    expect(after.payments[0].cancelledAt).not.toBeNull()
    expect(after.payments[1]).toMatchObject({
      id: newId,
      amountCzk: 16000,
      correctsReceiptId: original.id,
      isSummary: true,
    })
    expect(after.payments[1].rows.map((row) => row.amountCzk)).toEqual([6900, 9100])
    expect(after.terms.map((term) => term.owedCzk)).toEqual([0, 800])
  })

  it("corrects a refund without creating a debt or e-mail", async () => {
    await request("POST", "", { amountCzk: 7400, termId: firstTermId() })
    await request("POST", "/refunds", { amountCzk: 400, termId: firstTermId() })
    const refund = (await summary()).payments[1]
    expect(
      (
        await request("PATCH", `/${refund.id}`, {
          requestId: randomUUID(),
          amountCzk: 200,
          termId: firstTermId(),
        })
      ).status,
    ).toBe(204)
    expect((await summary()).terms[0].owedCzk).toBe(-300)
    expect(await latestEmailTo(applicantEmail, 0)).toBeUndefined()
  })

  it("keeps the original refund active when the replacement exceeds the term overpayment", async () => {
    await request("POST", "", { amountCzk: 7400, termId: firstTermId() })
    await request("POST", "/refunds", { amountCzk: 400, termId: firstTermId() })
    const refund = (await summary()).payments[1]
    const response = await request("PATCH", `/${refund.id}`, {
      requestId: randomUUID(),
      amountCzk: 600,
      termId: firstTermId(),
    })
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: "REFUND_EXCEEDS_OVERPAYMENT" })
    expect((await summary()).payments).toHaveLength(2)
    expect((await summary()).payments[1].cancelledAt).toBeNull()
    expect((await summary()).terms[0].owedCzk).toBe(-100)
  })

  it("moves a payment to another term and restores the first term's debt", async () => {
    await prisma.applicationTerm.updateMany({
      where: { applicationId, termId: termIds[1] },
      data: { status: "CONFIRMED" },
    })
    await request("POST", "", { amountCzk: 6900, termId: firstTermId() })
    const [original] = (await summary()).payments
    expect(
      (
        await request("PATCH", `/${original.id}`, {
          requestId: randomUUID(),
          amountCzk: 6900,
          termId: termIds[1],
        })
      ).status,
    ).toBe(204)
    expect((await summary()).terms.map((term) => term.owedCzk)).toEqual([6900, 3000])
    expect((await latestEmailTo(applicantEmail))?.subject).toContain("Payment correction")
  })

  it("sends e-mail 16 when removing a paid receipt creates a debt", async () => {
    await request("POST", "", { amountCzk: 6900, termId: firstTermId() })
    const [receipt] = (await summary()).payments
    expect((await request("DELETE", `/${receipt.id}`)).status).toBe(204)
    expect((await summary()).terms[0]).toMatchObject({ owedCzk: 6900, paymentStatus: "UNPAID" })
    const restarted = await prisma.applicationTerm.findFirstOrThrow({
      where: { applicationId, termId: firstTermId() },
    })
    expect(new Date((await summary()).terms[0].paymentDueAt!).getTime()).toBe(
      restarted.paymentPeriodStartedAt!.getTime() + 10 * 24 * 60 * 60 * 1000,
    )
    expect((await latestEmailTo(applicantEmail))?.subject).toContain("Payment correction")
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
        (await prisma.payment.findFirstOrThrow({ where: { receiptId: requestId } })).cancelledAt,
      ).not.toBeNull()
      // A genuinely new submission still settles the full remaining balance.
      expect((await request("POST", "", {})).status).toBe(204)
      expect((await summary()).amountPaidCzk).toBe(6900)
    },
  )

  it("does not restore a cancelled refund on retry or count it against a new refund", async () => {
    await request("POST", "", { amountCzk: 7400 })
    const requestId = randomUUID()
    expect(
      (await request("POST", "/refunds", { termId: firstTermId(), requestId, amountCzk: 500 }))
        .status,
    ).toBe(204)
    expect((await request("DELETE", `/${requestId}`)).status).toBe(204)
    expect(
      (await request("POST", "/refunds", { termId: firstTermId(), requestId, amountCzk: 500 }))
        .status,
    ).toBe(204)
    expect(await summary()).toMatchObject({ amountPaidCzk: 7400, amountOwedCzk: -500 })
    expect((await summary()).payments).toHaveLength(1)
    expect(
      (await request("POST", "/refunds", { termId: firstTermId(), requestId, amountCzk: 200 }))
        .status,
    ).toBe(409)
    expect((await request("POST", "", { requestId, amountCzk: 500 })).status).toBe(409)
    expect(
      (await request("POST", "/refunds", { termId: firstTermId(), amountCzk: 500 })).status,
    ).toBe(204)
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
    const overpaid = await summary()
    expect(overpaid.refundableTermId).toBe(firstTermId())
    expect(overpaid.terms.find((term) => term.termId === firstTermId())?.refundableCzk).toBe(300)
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
    expect(
      (await request("POST", "/refunds", { termId: firstTermId(), requestId, amountCzk: 200 }))
        .status,
    ).toBe(204)
    expect(
      (await request("POST", "/refunds", { termId: firstTermId(), requestId, amountCzk: 200 }))
        .status,
    ).toBe(204)
    expect(
      (await request("POST", "/refunds", { termId: firstTermId(), requestId, amountCzk: 300 }))
        .status,
    ).toBe(409)
    expect(await summary()).toMatchObject({ amountPaidCzk: 7200, amountOwedCzk: -300 })
    expect(
      (await request("POST", "/refunds", { termId: firstTermId(), amountCzk: 300 })).status,
    ).toBe(204)
    const result = await summary()
    expect(result).toMatchObject({ amountPaidCzk: 6900, amountOwedCzk: 0 })
    expect(result.payments.map((p) => p.amountCzk)).toEqual([7400, -200, -300])
    expect(result.refundableTermId).toBeNull()
    expect(
      (await prisma.payment.findFirstOrThrow({ where: { receiptId: requestId } })).recordedById,
    ).toBe(organizerId)
    expect((await request("DELETE", `/${requestId}`)).status).toBe(204)
    expect((await summary()).amountOwedCzk).toBe(-200)
  })

  it("serializes refunds so concurrent requests cannot exceed the overpayment", async () => {
    await request("POST", "", { amountCzk: 7400 })
    const responses = await Promise.all([
      request("POST", "/refunds", { termId: firstTermId(), amountCzk: 300 }),
      request("POST", "/refunds", { termId: firstTermId(), amountCzk: 300 }),
    ])
    expect(responses.map((r) => r.status).sort()).toEqual([204, 409])
    expect((await summary()).amountOwedCzk).toBe(-200)
  })

  it.each([undefined, null, 0, -1, 0.5, 501, "200"])(
    "rejects invalid or excessive refund %s",
    async (amountCzk) => {
      await request("POST", "", { amountCzk: 7400 })
      const response = await request("POST", "/refunds", { termId: firstTermId(), amountCzk })
      expect(response.status).toBe(amountCzk === 501 ? 409 : 400)
      expect((await summary()).payments).toHaveLength(1)
    },
  )

  it("rejects refunds without an overpayment and receipt UUID reuse as a refund", async () => {
    expect(
      (await request("POST", "/refunds", { termId: firstTermId(), amountCzk: 1 })).status,
    ).toBe(409)
    const requestId = randomUUID()
    await request("POST", "", { requestId, amountCzk: 7400 })
    expect(
      (await request("POST", "/refunds", { termId: firstTermId(), requestId, amountCzk: 7400 }))
        .status,
    ).toBe(409)
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

  it("returns the participant's date of birth and gender and the applicant's contact", async () => {
    expect(await summary()).toMatchObject({
      birthDate: "2000-01-01",
      gender: "FEMALE",
      email: applicantEmail,
    })
    const foreign = await request("GET", "", undefined, foreignCookie)
    expect(foreign.status).toBe(403)
    expect(JSON.stringify(await foreign.json())).not.toContain(applicantEmail)
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
        ["POST", "/refunds", { amountCzk: 100 }],
        ["DELETE", `/${payment.id}`, undefined],
        ["PATCH", `/${payment.id}`, { requestId: randomUUID(), amountCzk: 100 }],
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

  describe("payments per application in a term (US-137)", () => {
    /** The waitlisted second term gets confirmed, e.g. after a place was freed. */
    const confirmSecondTerm = (): Promise<unknown> =>
      prisma.applicationTerm.updateMany({
        where: { applicationId, termId: termIds[1] },
        data: { status: "CONFIRMED" },
      })
    const pay = (body: Record<string, unknown>): Promise<Response> => request("POST", "", body)

    it("derives the variable symbols from the application and term numbers", async () => {
      await confirmSecondTerm()
      const result = await summary()
      expect(result.variableSymbol).toBe(String(applicationNumber * 1000))
      expect(result.terms.map((term) => term.variableSymbol)).toEqual(
        result.terms.map((term) => String(applicationNumber * 1000 + term.termNumber)),
      )
    })

    it("returns the account of the organization next to the per-term amounts (US-110)", async () => {
      await confirmSecondTerm()
      const application = await prisma.application.findUniqueOrThrow({
        where: { id: applicationId },
        include: { organization: { select: { bankAccount: true } } },
      })
      const result = await summary()
      expect(result.bankAccount).toBe(application.organization.bankAccount)
      expect(result.terms.map((term) => [term.dueCzk, term.paidCzk, term.owedCzk])).toEqual([
        [6900, 0, 6900],
        [9900, 0, 9900],
      ])
    })

    it("keeps the first term paid and puts the debt only on the later confirmed one", async () => {
      expect((await pay({ termId: firstTermId() })).status).toBe(204)
      // The second term is a substitute: nothing is due on it yet.
      expect(await summary()).toMatchObject({ amountDueCzk: 6900, amountOwedCzk: 0, payableCzk: 0 })

      await confirmSecondTerm()
      const result = await summary()
      expect(result.terms.map((term) => [term.paymentStatus, term.owedCzk])).toEqual([
        ["PAID", 0],
        ["UNPAID", 9900],
      ])
      expect(result.payableCzk).toBe(9900)

      expect((await pay({ termId: termIds[1] })).status).toBe(204)
      expect(await summary()).toMatchObject({ amountOwedCzk: 0, payableCzk: 0 })
    })

    it("splits a summary payment from the earliest term, one receipt with several rows", async () => {
      await confirmSecondTerm()
      expect((await pay({ amountCzk: 10000 })).status).toBe(204)
      const result = await summary()
      expect(result.payments).toHaveLength(1)
      expect(result.payments[0].amountCzk).toBe(10000)
      expect(result.payments[0].rows.map((row) => [row.termId, row.amountCzk])).toEqual([
        [termIds[0], 6900],
        [termIds[1], 3100],
      ])
      expect(result.terms.map((term) => term.owedCzk)).toEqual([0, 6800])
      const rows = await prisma.payment.findMany({ where: { applicationTerm: { applicationId } } })
      expect(new Set(rows.map((row) => row.receiptId)).size).toBe(1)
    })

    it("marks both confirmed terms paid after one exact summary payment", async () => {
      await confirmSecondTerm()
      expect((await pay({ amountCzk: 16800 })).status).toBe(204)
      const result = await summary()
      expect(result.payments).toHaveLength(1)
      expect(result.payments[0].rows.map((row) => [row.termId, row.amountCzk])).toEqual([
        [termIds[0], 6900],
        [termIds[1], 9900],
      ])
      expect(result.terms.map((term) => [term.paymentStatus, term.owedCzk])).toEqual([
        ["PAID", 0],
        ["PAID", 0],
      ])
      expect(result.payableCzk).toBe(0)
    })

    it("leaves a shortfall on the later term and an overpayment on the last confirmed one", async () => {
      await confirmSecondTerm()
      await pay({ amountCzk: 7000 })
      expect((await summary()).terms.map((term) => term.owedCzk)).toEqual([0, 9800])
      await pay({}) // omitted amount settles the whole current debt
      const settled = await summary()
      expect(settled).toMatchObject({ amountOwedCzk: 0, payableCzk: 0 })

      await pay({ amountCzk: 500 })
      expect((await summary()).terms.map((term) => term.owedCzk)).toEqual([0, -500])
    })

    it("cancels the whole receipt of a summary payment and gives the debt back to both terms", async () => {
      await confirmSecondTerm()
      await pay({ amountCzk: 10000 })
      const [receipt] = (await summary()).payments
      expect((await request("DELETE", `/${receipt.id}`)).status).toBe(204)
      const result = await summary()
      expect(result.payments).toEqual([])
      expect(result.terms.map((term) => term.owedCzk)).toEqual([6900, 9900])
      // The rows stay, cancelled, for idempotent retries.
      const rows = await prisma.payment.findMany({ where: { receiptId: receipt.id } })
      expect(rows).toHaveLength(2)
      expect(rows.every((row) => row.cancelledAt !== null)).toBe(true)
    })

    it("records a payment of a term without debt as that term's overpayment", async () => {
      expect((await pay({ termId: termIds[1], amountCzk: 300 })).status).toBe(204)
      const result = await summary()
      expect(result.terms[1]).toMatchObject({ owedCzk: -300, paymentStatus: "OVERPAID" })
      expect(result.payableCzk).toBe(6900)
      // Owed over the application is due − paid, the payable amount does not set it off (D-088).
      expect(result.amountOwedCzk).toBe(6600)
    })

    it("settles only the remaining debt of one term when the amount is omitted", async () => {
      await confirmSecondTerm()
      await pay({ termId: firstTermId(), amountCzk: 1000 })
      expect((await pay({ termId: firstTermId() })).status).toBe(204)
      expect((await summary()).terms.map((term) => term.owedCzk)).toEqual([0, 9900])
      expect((await pay({ termId: firstTermId() })).status).toBe(400)
    })

    it("retries a summary payment without adding rows and rejects another amount", async () => {
      await confirmSecondTerm()
      const requestId = randomUUID()
      expect((await pay({ requestId, amountCzk: 10000 })).status).toBe(204)
      expect((await pay({ requestId, amountCzk: 10000 })).status).toBe(204)
      expect((await pay({ requestId, amountCzk: 9000 })).status).toBe(409)
      expect((await pay({ requestId, amountCzk: 10000, termId: firstTermId() })).status).toBe(409)
      const rows = await prisma.payment.findMany({ where: { receiptId: requestId } })
      expect(rows).toHaveLength(2)
    })

    it("serializes simultaneous summary payments", async () => {
      await confirmSecondTerm()
      const results = await Promise.all([pay({ amountCzk: 9000 }), pay({ amountCzk: 9000 })])
      expect(results.map((r) => r.status)).toEqual([204, 204])
      expect((await summary()).amountPaidCzk).toBe(18000)
      expect((await summary()).payments).toHaveLength(2)
    })

    it("needs a term for a refund and a term of this application", async () => {
      await pay({ amountCzk: 7400 })
      const noTerm = await request("POST", "/refunds", { amountCzk: 100 })
      expect(noTerm.status).toBe(400)
      expect(await noTerm.json()).toMatchObject({ code: "REFUND_TERM_REQUIRED" })

      const foreign = await prisma.term.findFirstOrThrow({
        where: { id: { notIn: termIds } },
      })
      for (const termId of [foreign.id, "missing"]) {
        const response = await request("POST", "/refunds", { termId, amountCzk: 100 })
        expect(response.status).toBe(400)
        expect(await response.json()).toMatchObject({ code: "PAYMENT_TERM_NOT_IN_APPLICATION" })
        expect((await pay({ termId, amountCzk: 100 })).status).toBe(400)
      }
      expect((await summary()).payments).toHaveLength(1)
    })

    it("limits a refund to the overpayment of its own term", async () => {
      await confirmSecondTerm()
      // 10000 → term 1 paid 6900, term 2 gets 3100 (not an overpayment).
      await pay({ amountCzk: 10000 })
      const response = await request("POST", "/refunds", { termId: termIds[1], amountCzk: 100 })
      expect(response.status).toBe(409)
      expect(await response.json()).toMatchObject({ code: "REFUND_EXCEEDS_OVERPAYMENT" })
      await pay({ termId: firstTermId(), amountCzk: 400 })
      expect(
        (await request("POST", "/refunds", { termId: firstTermId(), amountCzk: 400 })).status,
      ).toBe(204)
    })
  })
})
