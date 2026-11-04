// US-104: an organizer fills a freed bed with a waitlisted application by hand.
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type List = {
  freeBeds: { FEMALE: number; MALE: number }
  items: { applicationId: string; position: number; priceCzk: number }[]
}

describe("manual filling of a freed bed (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let foreignCookie: string
  let organizationId: string
  let eventId: string
  let termId: string
  let autoEventId: string
  let autoTermId: string
  let counter = 0

  const addApplication = async (
    gender: "FEMALE" | "MALE",
    minute: number,
    status: "CONFIRMED" | "WAITLISTED" = "WAITLISTED",
    event = { eventId, termId },
  ): Promise<string> => {
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId: event.eventId,
        accessToken: `us-104-${++counter}-${Date.now()}`,
        firstName: "Test",
        lastName: `Applicant${counter}`,
        birthDate: new Date("2010-01-01"),
        gender,
        email: `us104-${counter}@example.com`,
        consentAt: new Date(),
        submittedAt: new Date(Date.UTC(2027, 2, 10, 9, minute)),
        terms: {
          create: [{ organizationId, termId: event.termId, status, priceCzk: 4900 }],
        },
      },
    })
    return application.id
  }
  const url = (path = "", event = eventId, term = termId) =>
    api(`/organizer/events/${event}/terms/${term}/substitutes${path}`)
  const list = async (auth: string | null = cookie) =>
    fetch(url(), { headers: auth ? { Cookie: auth } : {} })
  const confirm = (
    applicationId: string,
    auth: string | null = cookie,
    event = eventId,
    term = termId,
  ) =>
    fetch(url(`/${applicationId}/confirm`, event, term), {
      method: "POST",
      headers: auth ? { Cookie: auth } : {},
    })
  const statusOf = async (applicationId: string) =>
    (await prisma.applicationTerm.findFirstOrThrow({ where: { applicationId } })).status

  const createEvent = async (
    name: string,
    token: string,
    mode: "MANUAL" | "AUTOMATIC",
    gender: "FEMALE" | "MALE" = "MALE",
  ) => {
    const event = await prisma.event.create({
      data: {
        organizationId,
        name,
        publicToken: token,
        evaluationMode: mode,
        terms: {
          create: [
            {
              organizationId,
              number: 1,
              name: "T1",
              rooms: { create: [{ organizationId, name: "A", capacity: 1, gender }] },
              startsOn: new Date("2027-07-01"),
              endsOn: new Date("2027-07-08"),
              priceCzk: 4900,
            },
          ],
        },
      },
      include: { terms: true },
    })
    return { eventId: event.id, termId: event.terms[0].id }
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    foreignCookie = await signIn("organizator2@example.com", "password2")
    const organizer = await prisma.user.findUniqueOrThrow({
      where: { email: "organizator@example.com" },
      include: { memberships: true },
    })
    organizationId = organizer.memberships[0].organizationId
    ;({ eventId, termId } = await createEvent("US-104", "us-104-event", "MANUAL"))
    ;({ eventId: autoEventId, termId: autoTermId } = await createEvent(
      "US-104 auto",
      "us-104-auto",
      "AUTOMATIC",
    ))
  })
  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it("is for organizers of the event only", async () => {
    expect((await list(null)).status).toBe(401)
    expect((await list(foreignCookie)).status).toBe(403)
    expect((await confirm("x", null)).status).toBe(401)
    expect((await confirm("x", foreignCookie)).status).toBe(403)
  })

  it("offers nobody while no bed is free", async () => {
    await addApplication("MALE", 0, "CONFIRMED")
    await addApplication("MALE", 1)
    const body = (await (await list()).json()) as List
    expect(body.freeBeds.MALE).toBe(0)
    expect(body.items).toEqual([])
    const second = await addApplication("MALE", 2)
    const response = await confirm(second)
    expect(response.status).toBe(409)
    expect(((await response.json()) as { code: string }).code).toBe("BED_ALREADY_TAKEN")
    expect(await statusOf(second)).toBe("WAITLISTED")
  })

  it("confirms one of the offered, logs it, and lets only one take the last bed", async () => {
    await prisma.applicationTerm.deleteMany({ where: { termId } })
    const first = await addApplication("MALE", 10)
    const second = await addApplication("MALE", 11)
    await addApplication("FEMALE", 9)

    const body = (await (await list()).json()) as List
    expect(body.freeBeds.MALE).toBe(1)
    // Only the men's bed is free: the woman is not offered, the men in order of receipt.
    expect(body.items.map((row) => row.applicationId)).toEqual([first, second])
    expect(body.items.map((row) => row.position)).toEqual([1, 2])
    expect(body.items.every((row) => row.priceCzk === 4900)).toBe(true)

    // Two organizers confirm different people for the last bed at the same moment.
    const results = await Promise.all([confirm(second), confirm(first)])
    expect(results.map((r) => r.status).sort()).toEqual([204, 409])
    const winner = results[0].status === 204 ? second : first
    const loser = winner === first ? second : first
    expect(await statusOf(winner)).toBe("CONFIRMED")
    expect(await statusOf(loser)).toBe("WAITLISTED")
    const log = await prisma.applicationTermStatusChange.findFirstOrThrow({
      where: { applicationTerm: { applicationId: winner } },
    })
    expect(log).toMatchObject({ fromStatus: "WAITLISTED", toStatus: "CONFIRMED" })
    expect(log.changedById).not.toBeNull()
    const confirmed = await prisma.applicationTerm.findFirstOrThrow({
      where: { applicationId: winner },
    })
    expect(confirmed.priceCzk).toBe(4900)
  })

  it("offers and confirms nobody whose gender has no free bed", async () => {
    const women = await createEvent("US-104 women", "us-104-women", "MANUAL", "FEMALE")
    const man = await addApplication("MALE", 30, "WAITLISTED", women)
    const woman = await addApplication("FEMALE", 31, "WAITLISTED", women)
    const listed = (await (
      await fetch(url("", women.eventId, women.termId), { headers: { Cookie: cookie } })
    ).json()) as List
    expect(listed.items.map((row) => row.applicationId)).toEqual([woman])
    const response = await confirm(man, cookie, women.eventId, women.termId)
    expect(response.status).toBe(409)
    expect(((await response.json()) as { code: string }).code).toBe("BED_ALREADY_TAKEN")
    expect(await statusOf(man)).toBe("WAITLISTED")
  })

  it("is not available in the automatic evaluation mode", async () => {
    const waiting = await addApplication("MALE", 20, "WAITLISTED", {
      eventId: autoEventId,
      termId: autoTermId,
    })
    const listed = (await (
      await fetch(url("", autoEventId, autoTermId), { headers: { Cookie: cookie } })
    ).json()) as List
    expect(listed.items).toEqual([])
    const response = await confirm(waiting, cookie, autoEventId, autoTermId)
    expect(response.status).toBe(409)
    expect(((await response.json()) as { code: string }).code).toBe("MANUAL_FILL_NOT_AVAILABLE")
    expect(await statusOf(waiting)).toBe("WAITLISTED")
  })

  it("answers 404 for a term of another event", async () => {
    expect((await fetch(url("", eventId, "unknown"), { headers: { Cookie: cookie } })).status).toBe(
      404,
    )
  })
})
