import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import {
  allEmailsTo,
  api,
  connectTestPrisma,
  hasSentNothingTo,
  latestEmailTo,
  resetAndSeed,
  signIn,
} from "@/test/integration/test-api"

type Status = "CONFIRMED" | "WAITLISTED" | "TO_EVALUATE" | "CANCELLED" | "ARCHIVED"

describe("cancelling a term cancels its applications (US-131, integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let foreignCookie: string
  let organizationId: string
  let organizerId: string
  let eventId: string
  let firstId: string
  let secondId: string
  let counter = 0

  const cancel = (
    auth: string | null,
    termId = firstId,
    body: object = { reason: "Areál není k dispozici" },
  ): Promise<Response> =>
    fetch(api(`/organizer/events/${eventId}/terms/${termId}/cancel`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(auth ? { Cookie: auth } : {}) },
      body: JSON.stringify(body),
    })

  /** One application with a row in the first term and, optionally, in the second. */
  const createApplication = async (
    status: Status,
    secondStatus?: Status,
    userId: string | null = null,
  ): Promise<{ id: string; email: string }> => {
    counter += 1
    const email = `us131-${counter}-${randomUUID()}@example.com`
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId,
        accessToken: randomUUID(),
        userId,
        firstName: `Adam${counter}`,
        lastName: "Zrušený",
        birthDate: new Date(`2010-02-${String(counter).padStart(2, "0")}`),
        gender: "MALE",
        email,
        locale: "cs",
        consentAt: new Date(),
        terms: {
          create: [
            { organizationId, termId: firstId, status, priceCzk: 4900 },
            ...(secondStatus
              ? [{ organizationId, termId: secondId, status: secondStatus, priceCzk: 3000 }]
              : []),
          ],
        },
      },
    })
    return { id: application.id, email }
  }
  const statusIn = async (applicationId: string, termId: string): Promise<string> =>
    (
      await prisma.applicationTerm.findUniqueOrThrow({
        where: { applicationId_termId: { applicationId, termId } },
      })
    ).status

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    foreignCookie = await signIn("organizator2@example.com", "password2")
    organizationId = (
      await prisma.organization.findFirstOrThrow({ where: { name: "Letní kemp z. s." } })
    ).id
    organizerId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "organizator@example.com" } })
    ).id
    const term = (number: number, startsOn: string) => ({
      organizationId,
      number,
      name: `T${number}`,
      startsOn: new Date(startsOn),
      endsOn: new Date(startsOn),
      priceCzk: 4900,
      rooms: { create: [{ organizationId, name: "R", capacity: 5, gender: "MALE" as const }] },
    })
    const event = await prisma.event.create({
      data: {
        organizationId,
        name: "US-131 cancellation",
        publicToken: `us131-${randomUUID()}`,
        terms: { create: [term(1, "2027-07-12"), term(2, "2027-07-19")] },
      },
      include: { terms: { orderBy: { number: "asc" } } },
    })
    eventId = event.id
    ;[firstId, secondId] = event.terms.map((row) => row.id)
  })

  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it("needs the organizer of the event", async () => {
    expect((await cancel(null)).status).toBe(401)
    expect((await cancel(foreignCookie)).status).toBe(403)
    expect(await prisma.term.count({ where: { id: firstId, cancelledAt: null } })).toBe(1)
  })

  it("cancels every status but archived, logs each and sends one e-mail per application", async () => {
    const confirmed = await createApplication("CONFIRMED", "CONFIRMED", organizerId)
    const waitlisted = await createApplication("WAITLISTED")
    const toEvaluate = await createApplication("TO_EVALUATE")
    const alreadyCancelled = await createApplication("CANCELLED")
    const archived = await createApplication("ARCHIVED")

    const response = await cancel(cookie)
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ cancelledApplications: 3 })

    expect(await statusIn(confirmed.id, firstId)).toBe("CANCELLED")
    expect(await statusIn(waitlisted.id, firstId)).toBe("CANCELLED")
    expect(await statusIn(toEvaluate.id, firstId)).toBe("CANCELLED")
    expect(await statusIn(archived.id, firstId)).toBe("ARCHIVED")
    // Other terms of the same application stay as they are.
    expect(await statusIn(confirmed.id, secondId)).toBe("CONFIRMED")

    const log = await prisma.applicationTermStatusChange.findMany({
      where: { applicationTerm: { termId: firstId } },
    })
    expect(log).toHaveLength(3)
    expect(log.map((entry) => entry.fromStatus).sort()).toEqual([
      "CONFIRMED",
      "TO_EVALUATE",
      "WAITLISTED",
    ])
    expect(log.every((entry) => entry.toStatus === "CANCELLED")).toBe(true)
    expect(log.every((entry) => entry.changedById === organizerId)).toBe(true)

    for (const { email } of [confirmed, waitlisted, toEvaluate]) {
      const mail = await latestEmailTo(email)
      expect(mail?.subject).toBe("Termín akce zrušen: US-131 cancellation")
      expect(allEmailsTo(email)).toHaveLength(1)
    }
    expect(await hasSentNothingTo(alreadyCancelled.email)).toBe(true)
    expect(await hasSentNothingTo(archived.email)).toBe(true)

    // The applicant with an account gets a bell notification; the one without has nobody to tell.
    const bell = await prisma.notification.findMany({ where: { applicationId: confirmed.id } })
    expect(bell).toHaveLength(1)
    expect(bell[0]).toMatchObject({
      userId: organizerId,
      type: "STATUS_CHANGED",
      kind: "TERM_CANCELLED",
      params: expect.objectContaining({
        eventName: "US-131 cancellation",
        termStartsOn: "2027-07-12",
        fromStatus: "CONFIRMED",
        toStatus: "CANCELLED",
      }),
    })
    expect(await prisma.notification.count({ where: { applicationId: waitlisted.id } })).toBe(0)
  })

  it("does not cancel the term twice", async () => {
    const again = await cancel(cookie)
    expect(again.status).toBe(409)
    expect(await again.json()).toMatchObject({ code: "TERM_CANCELLED" })
  })

  it("cancels a term without a reason", async () => {
    const empty = await cancel(cookie, secondId, {})
    expect(empty.status).toBe(201)
    expect(await prisma.term.findUniqueOrThrow({ where: { id: secondId } })).toMatchObject({
      cancelReason: null,
    })
  })

  it("counts the applications waiting for a decision in the term list", async () => {
    await createApplication("TO_EVALUATE", "TO_EVALUATE")
    const terms = (await (
      await fetch(api(`/organizer/events/${eventId}/terms`), { headers: { Cookie: cookie } })
    ).json()) as { id: string; toEvaluateCount: number }[]
    expect(terms.find((row) => row.id === secondId)?.toEvaluateCount).toBe(1)
  })
})
