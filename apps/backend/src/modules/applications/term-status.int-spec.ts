// US-28: an organizer changes the status of an application in a term by hand.
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type Status = "CONFIRMED" | "WAITLISTED" | "CANCELLED"
type TermView = {
  termId: string
  status: Status
  allowedStatuses: Status[]
  history: { fromStatus: Status; toStatus: Status; changedByName: string | null }[]
}

describe("manual status change of an application in a term (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let foreignCookie: string
  let participantCookie: string
  let organizerId: string
  let organizationId: string
  let eventId: string
  let termId: string
  let counter = 0

  const addApplication = async (gender: "FEMALE" | "MALE", status: Status): Promise<string> => {
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId,
        accessToken: `us-28-${++counter}-${Date.now()}`,
        firstName: "Test",
        lastName: `Applicant${counter}`,
        birthDate: new Date("2010-01-01"),
        gender,
        email: `us28-${counter}@example.com`,
        consentAt: new Date(),
        terms: { create: [{ organizationId, termId, status, priceCzk: 1000 }] },
      },
    })
    return application.id
  }

  const change = (
    applicationId: string,
    body: Record<string, unknown>,
    auth: string | undefined = cookie,
    term = termId,
  ): Promise<Response> =>
    fetch(api(`/organizer/applications/${applicationId}/terms/${term}/status`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(auth ? { Cookie: auth } : {}) },
      body: JSON.stringify(body),
    })
  const view = async (applicationId: string): Promise<TermView> => {
    const response = await fetch(api(`/organizer/applications/${applicationId}/terms`), {
      headers: { Cookie: cookie },
    })
    return ((await response.json()) as TermView[])[0]
  }

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
    organizerId = organizer.id
    organizationId = organizer.memberships[0].organizationId
    // One women's bed and one men's bed.
    const event = await prisma.event.create({
      data: {
        organizationId,
        name: "US-28",
        publicToken: "us-28-event",
        rooms: {
          create: [
            { organizationId, name: "A", capacity: 1, gender: "FEMALE" },
            { organizationId, name: "B", capacity: 1, gender: "MALE" },
          ],
        },
        terms: {
          create: [
            {
              organizationId,
              name: "T1",
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

  it("confirms a waitlisted application into a free bed and logs who, when and from-to", async () => {
    const id = await addApplication("FEMALE", "WAITLISTED")
    expect((await change(id, { status: "CONFIRMED" })).status).toBe(204)

    const term = await view(id)
    expect(term.status).toBe("CONFIRMED")
    expect(term.allowedStatuses).toEqual(["CANCELLED"])
    expect(term.history).toEqual([
      {
        id: expect.any(String),
        fromStatus: "WAITLISTED",
        toStatus: "CONFIRMED",
        changedByName: expect.any(String),
        changedAt: expect.any(String),
      },
    ])
    const log = await prisma.applicationTermStatusChange.findFirstOrThrow({
      where: { applicationTerm: { applicationId: id } },
    })
    expect(log.changedById).toBe(organizerId)
    expect(log.createdAt).toBeInstanceOf(Date)
  })

  it("warns instead of confirming beyond the free beds and confirms knowingly on request", async () => {
    // The only women's bed is taken by the first test.
    const id = await addApplication("FEMALE", "WAITLISTED")
    const response = await change(id, { status: "CONFIRMED" })
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: "CAPACITY_EXCEEDED" })
    expect((await view(id)).status).toBe("WAITLISTED")
    expect(
      await prisma.applicationTermStatusChange.count({
        where: { applicationTerm: { applicationId: id } },
      }),
    ).toBe(0)

    expect((await change(id, { status: "CONFIRMED", confirmOverCapacity: true })).status).toBe(204)
    expect((await view(id)).status).toBe("CONFIRMED")
  })

  it("cancels a confirmed application and a waitlisted one, which then frees the bed", async () => {
    const confirmed = await addApplication("MALE", "CONFIRMED")
    const waitlisted = await addApplication("MALE", "WAITLISTED")
    expect((await change(waitlisted, { status: "CONFIRMED" })).status).toBe(409)

    expect((await change(confirmed, { status: "CANCELLED" })).status).toBe(204)
    expect((await view(confirmed)).allowedStatuses).toEqual([])
    expect((await change(waitlisted, { status: "CONFIRMED" })).status).toBe(204)
  })

  it("rejects changes the state diagram does not have", async () => {
    const confirmed = await addApplication("MALE", "CONFIRMED")
    const cancelled = await addApplication("MALE", "CANCELLED")

    for (const [id, status] of [
      [confirmed, "WAITLISTED"],
      [confirmed, "CONFIRMED"],
      [cancelled, "CONFIRMED"],
      [cancelled, "CANCELLED"],
    ] as const) {
      const response = await change(id, { status })
      expect(response.status).toBe(409)
      expect(await response.json()).toMatchObject({ code: "INVALID_STATUS_TRANSITION" })
    }
  })

  it("validates the body and the term", async () => {
    const id = await addApplication("MALE", "CONFIRMED")
    expect((await change(id, { status: "ARCHIVED" })).status).toBe(400)
    expect((await change(id, {})).status).toBe(400)
    expect((await change(id, { status: "CANCELLED" }, cookie, "missing-term")).status).toBe(404)
  })

  it("requires an organizer of the application's organization", async () => {
    const id = await addApplication("MALE", "CONFIRMED")
    expect((await change(id, { status: "CANCELLED" }, "")).status).toBe(401)
    expect((await change(id, { status: "CANCELLED" }, participantCookie)).status).toBe(403)
    expect((await change(id, { status: "CANCELLED" }, foreignCookie)).status).toBe(403)
    expect((await view(id)).status).toBe("CONFIRMED")

    const read = await fetch(api(`/organizer/applications/${id}/terms`), {
      headers: { Cookie: foreignCookie },
    })
    expect(read.status).toBe(403)
  })
})
