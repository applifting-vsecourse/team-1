import { PrismaService } from "@/core/prisma/prisma.service"
import { Gender } from "@/generated/prisma/client"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

describe("event occupancy (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let organizationId: string
  let sequence = 0

  const get = (eventId: string, session = cookie): Promise<Response> =>
    fetch(api(`/organizer/events/${eventId}/occupancy`), { headers: { Cookie: session } })

  async function createEvent(roomMode: "GENDERED" | "SHARED"): Promise<{
    event: { id: string }
    term: (name: string, day: number, cancelledAt?: Date | null) => Promise<{ id: string }>
  }> {
    const event = await prisma.event.create({
      data: {
        organizationId,
        name: `Occupancy ${roomMode}`,
        publicToken: `occupancy-${roomMode}`,
        roomMode,
      },
    })
    const term = (
      name: string,
      day: number,
      cancelledAt: Date | null = null,
    ): Promise<{ id: string }> =>
      prisma.term.create({
        data: {
          organizationId,
          eventId: event.id,
          name,
          startsOn: new Date(Date.UTC(2027, 6, day)),
          endsOn: new Date(Date.UTC(2027, 6, day + 6)),
          priceCzk: 1000,
          cancelledAt,
        },
      })
    return { event, term }
  }

  async function apply(
    eventId: string,
    termId: string,
    gender: Gender,
    status: "CONFIRMED" | "WAITLISTED",
  ): Promise<void> {
    sequence += 1
    await prisma.application.create({
      data: {
        organizationId,
        eventId,
        accessToken: `occupancy-token-${sequence}`,
        firstName: "Test",
        lastName: `Applicant ${sequence}`,
        birthDate: new Date("2000-01-01"),
        gender,
        email: `occupancy${sequence}@example.com`,
        consentAt: new Date(),
        terms: { create: { organizationId, termId, status, priceCzk: 1000 } },
      },
    })
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    const member = await prisma.organizationMember.findFirstOrThrow({
      where: { user: { email: "organizator@example.com" } },
    })
    organizationId = member.organizationId
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("splits women and men in gendered rooms and ignores cancelled terms", async () => {
    const { event, term } = await createEvent("GENDERED")
    await prisma.room.createMany({
      data: [
        { organizationId, eventId: event.id, name: "W1", capacity: 3, gender: "FEMALE" },
        { organizationId, eventId: event.id, name: "W2", capacity: 2, gender: "FEMALE" },
        { organizationId, eventId: event.id, name: "M1", capacity: 2, gender: "MALE" },
      ],
    })
    const second = await term("Second", 19)
    const first = await term("First", 12)
    await term("Cancelled", 26, new Date())
    await apply(event.id, first.id, "FEMALE", "CONFIRMED")
    await apply(event.id, first.id, "MALE", "CONFIRMED")
    await apply(event.id, first.id, "MALE", "CONFIRMED")
    await apply(event.id, first.id, "MALE", "WAITLISTED")
    await apply(event.id, second.id, "FEMALE", "WAITLISTED")

    const response = await get(event.id)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.roomMode).toBe("GENDERED")
    expect(body.roomCount).toBe(3)
    expect(body.terms.map((item: { name: string }) => item.name)).toEqual(["First", "Second"])
    expect(body.terms[0]).toMatchObject({
      startsOn: "2027-07-12",
      endsOn: "2027-07-18",
      capacity: 7,
      confirmed: 3,
      free: 4,
      waitlisted: 1,
      byGender: {
        FEMALE: { capacity: 5, confirmed: 1, free: 4, waitlisted: 0 },
        MALE: { capacity: 2, confirmed: 2, free: 0, waitlisted: 1 },
      },
    })
    expect(body.terms[1].byGender.FEMALE).toEqual({
      capacity: 5,
      confirmed: 0,
      free: 5,
      waitlisted: 1,
    })
  })

  it("gives one summary per term in shared rooms", async () => {
    const { event, term } = await createEvent("SHARED")
    await prisma.room.createMany({
      data: [
        { organizationId, eventId: event.id, name: "S1", capacity: 4 },
        { organizationId, eventId: event.id, name: "S2", capacity: 4 },
      ],
    })
    const only = await term("Only", 12)
    await apply(event.id, only.id, "FEMALE", "CONFIRMED")
    await apply(event.id, only.id, "MALE", "CONFIRMED")
    await apply(event.id, only.id, "MALE", "WAITLISTED")

    const body = await (await get(event.id)).json()
    expect(body.roomMode).toBe("SHARED")
    expect(body.terms[0]).toMatchObject({
      capacity: 8,
      confirmed: 2,
      free: 6,
      waitlisted: 1,
      byGender: null,
    })
  })

  it("rejects missing session, participants and foreign or unknown events", async () => {
    const event = await prisma.event.findFirstOrThrow({ where: { organizationId } })
    expect((await get(event.id, "")).status).toBe(401)
    expect((await get(event.id, await signIn("ucastnik@example.com", "password4"))).status).toBe(
      403,
    )
    const foreign = await prisma.event.findFirstOrThrow({
      where: { organizationId: { not: organizationId } },
    })
    const response = await get(foreign.id)
    expect(response.status).toBe(403)
    expect(await response.text()).not.toContain(foreign.name)
    expect((await get("does-not-exist")).status).toBe(403)
  })
})
