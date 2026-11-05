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
        { id: firstId, selected: true },
        { id: secondId, selected: false },
      ],
    })
    expect((await change([secondId])).status).toBe(204)
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
    expect((await change([])).status).toBe(204)
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
})
