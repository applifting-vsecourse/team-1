import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { todayInPrague } from "@/modules/applications/domain/waitlist-expiry"
import {
  api,
  connectTestPrisma,
  latestEmailTo,
  resetAndSeed,
  signIn,
} from "@/test/integration/test-api"

describe("change requests after cancellation starts (integration)", () => {
  let prisma: PrismaService
  let participantCookie: string
  let organizerCookie: string
  let applicationId: string
  let eventId: string
  let firstId: string
  let secondId: string
  let requestId: string

  const participantUrl = () => api(`/participant/applications/${applicationId}/change-requests`)
  const notificationsUrl = () => api("/participant/change-request-notifications")
  const organizerUrl = (suffix = "") => api(`/organizer/events/${eventId}/change-requests${suffix}`)
  const postRequest = (termIds: string[], cookie = participantCookie) =>
    fetch(participantUrl(), {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ termIds }),
    })
  const decide = (
    id: string,
    kind: "approve" | "reject",
    reason?: string,
    cookie = organizerCookie,
  ) =>
    fetch(organizerUrl(`/${id}/${kind}`), {
      method: "PATCH",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify(reason === undefined ? {} : { reason }),
    })

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    participantCookie = await signIn("ucastnik@example.com", "password4")
    organizerCookie = await signIn("organizator@example.com", "password1")
    const applicant = await prisma.user.findUniqueOrThrow({
      where: { email: "ucastnik@example.com" },
    })
    const organization = await prisma.organization.findFirstOrThrow({
      where: { name: "Letní kemp z. s." },
    })
    const event = await prisma.event.create({
      data: {
        organizationId: organization.id,
        name: "US-114 requests",
        publicToken: `us114-${randomUUID()}`,
        cancellationStartsOn: todayInPrague(new Date()),
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
        userId: applicant.id,
        accessToken: randomUUID(),
        firstName: "Adam",
        lastName: "Test",
        birthDate: new Date("2010-01-01"),
        gender: "MALE",
        email: applicant.email,
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
    })
    applicationId = application.id
  })

  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it("stores a pending request and keeps the application unchanged", async () => {
    const response = await postRequest([secondId])
    expect(response.status).toBe(201)
    const request = await response.json()
    requestId = request.id
    expect(request).toMatchObject({
      status: "PENDING",
      currentTermIds: [firstId],
      requestedTermIds: [secondId],
      currentPriceCzk: 1000,
      requestedPriceCzk: 2000,
    })
    expect(
      await prisma.applicationTerm.findMany({
        where: { applicationId },
        select: { termId: true, status: true },
      }),
    ).toEqual([{ termId: firstId, status: "CONFIRMED" }])
    expect(
      (await (await fetch(participantUrl(), { headers: { Cookie: participantCookie } })).json())[0],
    ).toMatchObject({ id: requestId, status: "PENDING" })
    const queue = await fetch(organizerUrl(), { headers: { Cookie: organizerCookie } })
    expect((await queue.json()).map((row: { id: string }) => row.id)).toContain(requestId)
    expect((await latestEmailTo("ucastnik@example.com"))?.subject).toMatch(
      /Application change request|Žádost o změnu přihlášky/,
    )
    expect((await postRequest([secondId])).status).toBe(409)
    const notifications = await (
      await fetch(notificationsUrl(), { headers: { Cookie: participantCookie } })
    ).json()
    expect(notifications[0]).toMatchObject({ id: requestId, status: "PENDING", readAt: null })
    expect(
      (
        await fetch(`${notificationsUrl()}/${requestId}/read`, {
          method: "PATCH",
          headers: { Cookie: participantCookie },
        })
      ).status,
    ).toBe(204)
    expect(
      (
        await (await fetch(notificationsUrl(), { headers: { Cookie: participantCookie } })).json()
      )[0].readAt,
    ).not.toBeNull()
  })

  it("rejects unauthorized access", async () => {
    expect((await postRequest([], organizerCookie)).status).toBe(403)
    expect((await fetch(organizerUrl(), { headers: { Cookie: participantCookie } })).status).toBe(
      403,
    )
    expect((await decide(requestId, "approve", undefined, participantCookie)).status).toBe(403)

    const applicant = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: "Foreign Participant",
        email: `foreign-${randomUUID()}@example.com`,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    const foreign = await prisma.organization.create({
      data: { name: "Foreign organization", bankAccount: "123456789/0100" },
    })
    const event = await prisma.event.create({
      data: {
        organizationId: foreign.id,
        name: "Foreign event",
        publicToken: `foreign-us114-${randomUUID()}`,
      },
    })
    const application = await prisma.application.create({
      data: {
        organizationId: foreign.id,
        eventId: event.id,
        userId: applicant.id,
        accessToken: randomUUID(),
        firstName: "Foreign",
        lastName: "Participant",
        birthDate: new Date("2010-01-01"),
        gender: "MALE",
        email: applicant.email,
        consentAt: new Date(),
      },
    })
    const foreignRequest = await prisma.changeRequest.create({
      data: {
        organizationId: foreign.id,
        eventId: event.id,
        applicationId: application.id,
        applicantId: applicant.id,
        currentTermIds: [],
        requestedTermIds: [],
      },
    })
    expect(
      (await fetch(organizerUrl(`/${foreignRequest.id}`), { headers: { Cookie: organizerCookie } }))
        .status,
    ).toBe(403)
    expect((await decide(foreignRequest.id, "approve")).status).toBe(403)
    expect((await decide(foreignRequest.id, "reject")).status).toBe(403)
    expect(
      (
        await fetch(`${notificationsUrl()}/${foreignRequest.id}/read`, {
          method: "PATCH",
          headers: { Cookie: participantCookie },
        })
      ).status,
    ).toBe(403)
    await prisma.organization.delete({ where: { id: foreign.id } })
    await prisma.user.delete({ where: { id: applicant.id } })
  })

  it("approves exactly once and applies the change atomically", async () => {
    const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } })
    const competingTerms: string[] = []
    for (const number of [1, 2]) {
      const competing = await prisma.application.create({
        data: {
          organizationId: event.organizationId,
          eventId,
          accessToken: randomUUID(),
          firstName: `Other${number}`,
          lastName: "Participant",
          birthDate: new Date(`201${number}-01-01`),
          gender: "MALE",
          email: `other${number}@example.test`,
          consentAt: new Date(),
          terms: {
            create: [
              {
                organizationId: event.organizationId,
                termId: secondId,
                status: "CONFIRMED",
                priceCzk: 2000,
              },
            ],
          },
        },
        include: { terms: true },
      })
      competingTerms.push(competing.terms[0].id)
    }
    const full = await decide(requestId, "approve")
    expect(full.status).toBe(409)
    expect(await full.json()).toMatchObject({ code: "CAPACITY_EXCEEDED" })
    expect(
      (await prisma.changeRequest.findUniqueOrThrow({ where: { id: requestId } })).status,
    ).toBe("PENDING")
    expect(
      (await prisma.applicationTerm.findFirstOrThrow({ where: { applicationId, termId: firstId } }))
        .status,
    ).toBe("CONFIRMED")
    await prisma.applicationTerm.update({
      where: { id: competingTerms[0] },
      data: { status: "CANCELLED" },
    })
    expect((await decide(requestId, "approve")).status).toBe(204)
    expect((await decide(requestId, "approve")).status).toBe(409)
    const terms = await prisma.applicationTerm.findMany({
      where: { applicationId },
      orderBy: { termId: "asc" },
    })
    expect(terms.find((row) => row.termId === firstId)?.status).toBe("CANCELLED")
    expect(terms.find((row) => row.termId === secondId)?.status).toBe("CONFIRMED")
    expect(
      (await prisma.changeRequest.findUniqueOrThrow({ where: { id: requestId } })).status,
    ).toBe("APPROVED")
    expect(
      (
        await (await fetch(notificationsUrl(), { headers: { Cookie: participantCookie } })).json()
      )[0],
    ).toMatchObject({ id: requestId, status: "APPROVED", readAt: null })
    expect(
      (await (await fetch(organizerUrl(), { headers: { Cookie: organizerCookie } })).json()).map(
        (row: { id: string }) => row.id,
      ),
    ).not.toContain(requestId)
  })

  it("can reject the next cancellation request without changing the application", async () => {
    const response = await postRequest([])
    expect(response.status).toBe(201)
    const id = (await response.json()).id as string
    expect((await decide(id, "reject", "Please contact us")).status).toBe(204)
    expect((await prisma.changeRequest.findUniqueOrThrow({ where: { id } })).rejectionReason).toBe(
      "Please contact us",
    )
    expect(
      (
        await prisma.applicationTerm.findFirstOrThrow({
          where: { applicationId, termId: secondId },
        })
      ).status,
    ).toBe("CONFIRMED")
    expect(
      (await (await fetch(participantUrl(), { headers: { Cookie: participantCookie } })).json())[0],
    ).toMatchObject({ id, status: "REJECTED", rejectionReason: "Please contact us" })
  })

  it("requires the approval flow only after the configured date", async () => {
    const future = todayInPrague(new Date())
    future.setUTCDate(future.getUTCDate() + 1)
    await prisma.event.update({ where: { id: eventId }, data: { cancellationStartsOn: future } })
    const response = await postRequest([])
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: "CHANGE_REQUEST_NOT_REQUIRED" })
  })
})
