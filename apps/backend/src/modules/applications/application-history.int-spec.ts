// US-53: the history of an application lists every change with its time, author and change.
import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type Entry = {
  id: string
  kind: "APPLICATION_CREATED" | "STATUS_CHANGE" | "PAYMENT"
  at: string
  author: string | null
  fromStatus?: string
  toStatus?: string
  amountCzk?: number
}

describe("history of an application (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let foreignCookie: string
  let participantCookie: string
  let organizationId: string
  let organizerName: string
  let applicationId: string
  let termId: string

  const history = (id: string, auth: string | null = cookie) =>
    fetch(api(`/organizer/applications/${id}/history`), {
      headers: auth ? { Cookie: auth } : {},
    })
  const send = (path: string, method: string, body: Record<string, unknown>) =>
    fetch(api(path), {
      method,
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    foreignCookie = await signIn("organizator2@example.com", "password2")
    participantCookie = await signIn("ucastnik@example.com", "password4")
    const organizer = await prisma.user.findUniqueOrThrow({
      where: { email: "organizator@example.com" },
      include: { memberships: true },
    })
    organizationId = organizer.memberships[0].organizationId
    organizerName = organizer.name

    const event = await prisma.event.create({
      data: {
        organizationId,
        name: "US-53 history",
        publicToken: `us-53-${Date.now()}`,
        evaluationMode: "MANUAL",
        terms: {
          create: [
            {
              organizationId,
              number: 1,
              name: "T1",
              roomMode: "SHARED",
              rooms: { create: [{ organizationId, name: "A", capacity: 5, gender: null }] },
              startsOn: new Date("2027-07-01"),
              endsOn: new Date("2027-07-08"),
              priceCzk: 4900,
            },
          ],
        },
      },
      include: { terms: true },
    })
    termId = event.terms[0].id
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId: event.id,
        accessToken: `us-53-${Date.now()}`,
        firstName: "Adam",
        lastName: "Dvořák",
        birthDate: new Date("2000-05-15"),
        gender: "MALE",
        email: "us53-applicant@example.com",
        consentAt: new Date(),
        terms: { create: [{ organizationId, termId, status: "TO_EVALUATE", priceCzk: 4900 }] },
      },
    })
    applicationId = application.id
  })
  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it("lists the creation, a status change and a payment with their author, newest first", async () => {
    expect(
      (
        await send(`/organizer/applications/${applicationId}/terms/${termId}/status`, "PATCH", {
          status: "CONFIRMED",
        })
      ).status,
    ).toBe(204)
    expect(
      (
        await send(`/organizer/applications/${applicationId}/payments`, "POST", {
          requestId: randomUUID(),
          amountCzk: 2000,
          termId,
        })
      ).status,
    ).toBe(204)

    const response = await history(applicationId)
    expect(response.status).toBe(200)
    const entries = (await response.json()) as Entry[]

    expect(entries.map((entry) => entry.kind)).toEqual([
      "PAYMENT",
      "STATUS_CHANGE",
      "APPLICATION_CREATED",
    ])
    expect(entries[0]).toMatchObject({ amountCzk: 2000, author: organizerName })
    expect(entries[1]).toMatchObject({
      fromStatus: "TO_EVALUATE",
      toStatus: "CONFIRMED",
      author: organizerName,
    })
    expect(entries[2].author).toBe("us53-applicant@example.com")
    for (const entry of entries) expect(Number.isNaN(Date.parse(entry.at))).toBe(false)
  })

  it("answers 401 without a session and 403 for a participant or a foreign organization", async () => {
    expect((await history(applicationId, null)).status).toBe(401)
    expect((await history(applicationId, participantCookie)).status).toBe(403)
    expect((await history(applicationId, foreignCookie)).status).toBe(403)
  })
})
