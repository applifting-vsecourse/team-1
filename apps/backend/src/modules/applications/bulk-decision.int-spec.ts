// US-108: an organizer puts many applications waiting for evaluation on the waitlist, or rejects them.
import { PrismaService } from "@/core/prisma/prisma.service"
import {
  api,
  connectTestPrisma,
  hasSentNothingTo,
  latestEmailTo,
  resetAndSeed,
  signIn,
} from "@/test/integration/test-api"

type Status = "TO_EVALUATE" | "CONFIRMED" | "WAITLISTED" | "CANCELLED"
type Result = { changed: string[]; unchanged: string[] }

describe("bulk decision on applications in a term (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let foreignCookie: string
  let participantCookie: string
  let organizationId: string
  let eventId: string
  let termId: string
  let counter = 0

  const addApplication = async (
    gender: "FEMALE" | "MALE",
    minute: number,
    status: Status = "TO_EVALUATE",
  ): Promise<{ id: string; email: string }> => {
    const email = `us108-${++counter}-${Date.now()}@example.com`
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId,
        accessToken: `us-108-${counter}-${Date.now()}`,
        firstName: "Test",
        lastName: `Applicant${counter}`,
        birthDate: new Date("2010-01-01"),
        gender,
        email,
        consentAt: new Date(),
        submittedAt: new Date(Date.UTC(2027, 2, 10, 9, minute)),
        terms: { create: [{ organizationId, termId, status, priceCzk: 1000 }] },
      },
    })
    return { id: application.id, email }
  }
  const post = (body: unknown, auth: string | null = cookie, term = termId) =>
    fetch(api(`/organizer/events/${eventId}/terms/${term}/bulk-decision`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(auth ? { Cookie: auth } : {}) },
      body: JSON.stringify(body),
    })
  const statusOf = async (applicationId: string) =>
    (await prisma.applicationTerm.findFirstOrThrow({ where: { applicationId, termId } })).status

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
    const event = await prisma.event.create({
      data: {
        organizationId,
        name: "US-108",
        publicToken: "us-108-event",
        terms: {
          create: [
            {
              organizationId,
              number: 1,
              name: "T1",
              rooms: { create: [{ organizationId, name: "A", capacity: 1, gender: "MALE" }] },
              startsOn: new Date("2027-07-01"),
              endsOn: new Date("2027-07-08"),
              priceCzk: 1000,
            },
          ],
        },
      },
      include: { terms: true },
    })
    eventId = event.id
    termId = event.terms[0].id
  })
  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it("is for organizers of the event only, and changes nothing in a foreign one", async () => {
    const victim = await addApplication("MALE", 50)
    const body = { decision: "REJECT", applicationIds: [victim.id] }
    expect((await post(body, null)).status).toBe(401)
    expect((await post(body, participantCookie)).status).toBe(403)
    const foreign = await post(body, foreignCookie)
    expect(foreign.status).toBe(403)
    expect(await foreign.text()).not.toContain(victim.id)
    expect(await statusOf(victim.id)).toBe("TO_EVALUATE")
  })

  it("waitlists those waiting for evaluation, skips the others, logs every change and e-mails each applicant once", async () => {
    const jana = await addApplication("FEMALE", 3)
    const adam = await addApplication("MALE", 1)
    const confirmed = await addApplication("MALE", 0, "CONFIRMED")
    const cancelled = await addApplication("FEMALE", 0, "CANCELLED")
    const ids = [jana.id, adam.id, confirmed.id, cancelled.id]

    const response = await post({ decision: "WAITLIST", applicationIds: ids })
    expect(response.status).toBe(200)
    const result = (await response.json()) as Result
    expect(result.changed).toEqual([adam.id, jana.id])
    expect(result.unchanged.sort()).toEqual([confirmed.id, cancelled.id].sort())
    expect(await statusOf(adam.id)).toBe("WAITLISTED")
    expect(await statusOf(jana.id)).toBe("WAITLISTED")
    expect(await statusOf(confirmed.id)).toBe("CONFIRMED")
    expect(await statusOf(cancelled.id)).toBe("CANCELLED")

    const organizer = await prisma.user.findUniqueOrThrow({
      where: { email: "organizator@example.com" },
    })
    for (const { id } of [adam, jana]) {
      const log = await prisma.applicationTermStatusChange.findMany({
        where: { applicationTerm: { applicationId: id } },
      })
      expect(log).toHaveLength(1)
      expect(log[0]).toMatchObject({
        fromStatus: "TO_EVALUATE",
        toStatus: "WAITLISTED",
        changedById: organizer.id,
      })
    }
    expect(
      await prisma.applicationTermStatusChange.count({
        where: { applicationTerm: { applicationId: { in: [confirmed.id, cancelled.id] } } },
      }),
    ).toBe(0)

    expect((await latestEmailTo(adam.email))?.subject).toContain("US-108")
    expect((await latestEmailTo(jana.email))?.subject).toContain("US-108")
    expect(await hasSentNothingTo(confirmed.email)).toBe(true)
    expect(await hasSentNothingTo(cancelled.email)).toBe(true)
  })

  it("queues the waitlisted in order of receipt, not of the time of the bulk action", async () => {
    const late = await addApplication("MALE", 40)
    const early = await addApplication("MALE", 30)
    // The later one is decided first, in a separate action.
    await post({ decision: "WAITLIST", applicationIds: [late.id] })
    await post({ decision: "WAITLIST", applicationIds: [early.id] })

    const rows = (await (
      await fetch(
        api(`/organizer/events/${eventId}/applications?termId=${termId}&status=WAITLISTED`),
        {
          headers: { Cookie: cookie },
        },
      )
    ).json()) as { id: string; terms: { id: string; waitlistPosition: number | null }[] }[]
    const position = (id: string) =>
      rows.find((row) => row.id === id)!.terms.find((term) => term.id === termId)!.waitlistPosition
    expect(position(early.id)).toBeLessThan(position(late.id)!)
  })

  it("rejects to Zrušená, logs it and e-mails the applicant", async () => {
    const petr = await addApplication("MALE", 60)

    const result = (await (
      await post({ decision: "REJECT", applicationIds: [petr.id] })
    ).json()) as Result
    expect(result.changed).toEqual([petr.id])
    expect(await statusOf(petr.id)).toBe("CANCELLED")
    expect(
      await prisma.applicationTermStatusChange.findFirstOrThrow({
        where: { applicationTerm: { applicationId: petr.id } },
      }),
    ).toMatchObject({ fromStatus: "TO_EVALUATE", toStatus: "CANCELLED" })
    expect(await latestEmailTo(petr.email)).toBeDefined()
    // Zrušená is terminal: a second attempt changes nothing.
    const again = (await (
      await post({ decision: "WAITLIST", applicationIds: [petr.id] })
    ).json()) as Result
    expect(again).toMatchObject({ changed: [], unchanged: [petr.id] })
    expect(await statusOf(petr.id)).toBe("CANCELLED")
  })

  it("validates the body and answers 404 for a term of another event", async () => {
    expect((await post({ decision: "CONFIRM", applicationIds: ["x"] })).status).toBe(400)
    expect((await post({ decision: "REJECT", applicationIds: [] })).status).toBe(400)
    expect(
      (await post({ decision: "REJECT", applicationIds: ["x"] }, cookie, "unknown")).status,
    ).toBe(404)
  })
})
