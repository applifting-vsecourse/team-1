import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { todayInPrague } from "@/modules/applications/domain/waitlist-expiry"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

describe("participant changes before cancellation starts (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let organizerCookie: string
  let applicationId: string
  let eventId: string
  let firstId: string
  let secondId: string
  let userId: string

  const options = (id = applicationId, auth = cookie): Promise<Response> =>
    fetch(api(`/participant/applications/${id}/change-options`), { headers: { Cookie: auth } })
  const change = (termIds: string[], id = applicationId, auth = cookie): Promise<Response> =>
    fetch(api(`/participant/applications/${id}/terms`), {
      method: "PUT",
      headers: { Cookie: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ termIds }),
    })

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("ucastnik@example.com", "password4")
    organizerCookie = await signIn("organizator@example.com", "password1")
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "ucastnik@example.com" } })
    const organization = await prisma.organization.findFirstOrThrow({
      where: { name: "Letní kemp z. s." },
    })
    userId = user.id
    const event = await prisma.event.create({
      data: {
        organizationId: organization.id,
        name: "US-113 participant change",
        publicToken: `us113-${randomUUID()}`,
        terms: {
          create: [
            {
              organizationId: organization.id,
              number: 1,
              name: "First",
              startsOn: new Date("2027-07-01"),
              endsOn: new Date("2027-07-07"),
              priceCzk: 1000,
              rooms: {
                create: [
                  { organizationId: organization.id, name: "A", capacity: 2, gender: "MALE" },
                ],
              },
            },
            {
              organizationId: organization.id,
              number: 2,
              name: "Second",
              startsOn: new Date("2027-07-08"),
              endsOn: new Date("2027-07-14"),
              priceCzk: 2000,
              rooms: {
                create: [
                  { organizationId: organization.id, name: "B", capacity: 2, gender: "MALE" },
                ],
              },
            },
          ],
        },
      },
      include: { terms: { orderBy: { number: "asc" } } },
    })
    eventId = event.id
    firstId = event.terms[0].id
    secondId = event.terms[1].id
    const application = await prisma.application.create({
      data: {
        organizationId: organization.id,
        eventId,
        userId,
        accessToken: randomUUID(),
        firstName: "Adam",
        lastName: "Test",
        birthDate: new Date("2010-01-01"),
        gender: "MALE",
        email: user.email,
        consentAt: new Date(),
        terms: {
          create: [
            {
              organizationId: organization.id,
              termId: firstId,
              status: "CONFIRMED",
              priceCzk: 1000,
            },
          ],
        },
      },
      include: { terms: true },
    })
    applicationId = application.id
    const organizer = await prisma.user.findUniqueOrThrow({
      where: { email: "organizator@example.com" },
    })
    await prisma.payment.create({
      data: {
        organizationId: organization.id,
        applicationTermId: application.terms[0].id,
        receiptId: randomUUID(),
        amountCzk: 1000,
        recordedById: organizer.id,
      },
    })
  })

  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it("without a date immediately replaces terms, records the cancellation and keeps the payment", async () => {
    expect(await (await options()).json()).toMatchObject({
      canChangeImmediately: true,
      terms: [
        {
          id: firstId,
          selected: true,
          priceCzk: 1000,
          paidCzk: 1000,
          owedBeforeCancellationCzk: 0,
          owedAfterCancellationCzk: 0,
          overpaymentAfterCancellationCzk: 1000,
        },
        {
          id: secondId,
          selected: false,
          priceCzk: 2000,
          owedAfterChangeCzk: 2000,
          paidCzk: 0,
          owedBeforeCancellationCzk: 0,
          owedAfterCancellationCzk: 0,
          overpaymentAfterCancellationCzk: 0,
        },
      ],
    })
    const response = await change([secondId])
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ addedTerms: [{ termId: secondId, owedCzk: 2000 }] })
    const terms = await prisma.applicationTerm.findMany({
      where: { applicationId },
      orderBy: { termId: "asc" },
      include: { payments: true },
    })
    expect(terms.find((term) => term.termId === firstId)).toMatchObject({
      status: "CANCELLED",
      payments: [{ amountCzk: 1000 }],
    })
    expect(terms.find((term) => term.termId === secondId)).toMatchObject({
      status: "CONFIRMED",
      priceCzk: 2000,
    })
    expect(
      await prisma.applicationTermStatusChange.findFirst({
        where: { applicationTerm: { applicationId, termId: firstId } },
      }),
    ).toMatchObject({ fromStatus: "CONFIRMED", toStatus: "CANCELLED", changedById: userId })
  })

  it("with a future date immediately cancels all remaining terms", async () => {
    const future = todayInPrague(new Date())
    future.setUTCDate(future.getUTCDate() + 1)
    await prisma.event.update({ where: { id: eventId }, data: { cancellationStartsOn: future } })
    const response = await change([])
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ addedTerms: [] })
    expect(
      await prisma.applicationTerm.count({
        where: { applicationId, status: { not: "CANCELLED" } },
      }),
    ).toBe(0)
  })

  it("from the start date blocks changes without making writes", async () => {
    await prisma.event.update({
      where: { id: eventId },
      data: { cancellationStartsOn: todayInPrague(new Date()) },
    })
    expect(await (await options()).json()).toMatchObject({ canChangeImmediately: false })
    const response = await change([secondId])
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: "CANCELLATION_APPROVAL_REQUIRED" })
    expect(
      await prisma.applicationTerm.count({
        where: { applicationId, status: { not: "CANCELLED" } },
      }),
    ).toBe(0)
  })

  it("rejects someone else's application and an organizer session", async () => {
    expect((await options("foreign-id")).status).toBe(403)
    expect((await change([], "foreign-id")).status).toBe(403)
    expect((await options(applicationId, organizerCookie)).status).toBe(403)
  })

  it.each([
    {
      mode: "AUTOMATIC" as const,
      approval: false,
      full: false,
      fillAfterPreview: false,
      status: "CONFIRMED",
      owed: 2000,
    },
    {
      mode: "MANUAL" as const,
      approval: false,
      full: false,
      fillAfterPreview: false,
      status: "TO_EVALUATE",
      owed: 0,
    },
    {
      mode: "AUTOMATIC" as const,
      approval: false,
      full: true,
      fillAfterPreview: false,
      status: "WAITLISTED",
      owed: 0,
    },
    {
      mode: "AUTOMATIC" as const,
      approval: false,
      full: false,
      fillAfterPreview: true,
      status: "WAITLISTED",
      owed: 0,
    },
    {
      mode: "MANUAL" as const,
      approval: true,
      full: false,
      fillAfterPreview: false,
      status: "CONFIRMED",
      owed: 2000,
    },
  ])(
    "returns domain debt for $mode, approval=$approval, full=$full, fillAfterPreview=$fillAfterPreview",
    async ({ mode, approval, full, fillAfterPreview, status, owed }) => {
      const { organizationId } = await prisma.event.update({
        where: { id: eventId },
        data: {
          evaluationMode: mode,
          cancellationStartsOn: approval ? todayInPrague(new Date()) : null,
        },
      })
      const createdIds: string[] = []
      const createApplicant = async (termId: string): Promise<string> => {
        const applicant = await prisma.application.create({
          data: {
            organizationId,
            eventId,
            userId,
            accessToken: randomUUID(),
            firstName: "Payment impact",
            lastName: randomUUID(),
            birthDate: new Date("2010-01-01"),
            gender: "MALE",
            email: "ucastnik@example.com",
            consentAt: new Date(),
            terms: {
              create: { organizationId, termId, status: "CONFIRMED", priceCzk: 1000 },
            },
          },
        })
        createdIds.push(applicant.id)
        return applicant.id
      }
      const fillTarget = async (): Promise<void> => {
        await createApplicant(secondId)
        await createApplicant(secondId)
      }
      try {
        const id = await createApplicant(firstId)
        if (full) await fillTarget()
        const preview = await (await options(id)).json()
        expect(preview.canChangeImmediately).toBe(!approval)
        expect(preview.terms.find((term: { id: string }) => term.id === firstId)).toMatchObject({
          paidCzk: 0,
          owedBeforeCancellationCzk: 1000,
          owedAfterCancellationCzk: 0,
        })
        expect(preview.terms.find((term: { id: string }) => term.id === secondId)).toMatchObject({
          priceCzk: 2000,
          owedAfterChangeCzk: (mode === "AUTOMATIC" || approval) && !full ? 2000 : 0,
        })
        if (fillAfterPreview) await fillTarget()
        if (approval) {
          const response = await fetch(api(`/participant/applications/${id}/change-requests`), {
            method: "POST",
            headers: { Cookie: cookie, "Content-Type": "application/json" },
            body: JSON.stringify({ termIds: [secondId] }),
          })
          expect(response.status).toBe(201)
          const request = await response.json()
          expect(
            (
              await fetch(
                api(`/organizer/events/${eventId}/change-requests/${request.id}/approve`),
                {
                  method: "PATCH",
                  headers: { Cookie: organizerCookie },
                },
              )
            ).status,
          ).toBe(204)
        } else {
          const response = await change([secondId], id)
          expect(response.status).toBe(200)
          expect(await response.json()).toEqual({
            addedTerms: [{ termId: secondId, owedCzk: owed }],
          })
        }
        expect(
          await prisma.applicationTerm.findUniqueOrThrow({
            where: { applicationId_termId: { applicationId: id, termId: secondId } },
          }),
        ).toMatchObject({ status, priceCzk: 2000 })
      } finally {
        await prisma.application.deleteMany({ where: { id: { in: createdIds } } })
      }
    },
  )
})
