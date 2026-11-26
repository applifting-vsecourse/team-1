import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type Proposal = {
  placements: { applicationTermId: string; roomId: string }[]
  unplaced: { applicationTermId: string; reason: string }[]
  wishes: { applicationTermId: string; name: string; fulfilled: boolean }[]
}

describe("room proposal (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let participantCookie: string
  let foreignCookie: string
  let organizationId: string
  let eventId: string
  let termId: string
  let girlsRoom: string
  let boysRoom: string
  let counter = 0

  const base = (targetTermId = termId): string =>
    `/organizer/events/${eventId}/terms/${targetTermId}/room-assignments`
  const call = (path: string, method = "GET", body?: unknown, session = cookie) =>
    fetch(api(path), {
      method,
      headers: { Cookie: session, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  const propose = async (targetTermId = termId): Promise<Proposal> =>
    (await call(`${base(targetTermId)}/proposal`, "POST")).json() as Promise<Proposal>
  const makePerson = async (
    firstName: string,
    lastName: string,
    gender: "FEMALE" | "MALE",
    extra: {
      status?: "CONFIRMED" | "TO_EVALUATE" | "WAITLISTED"
      individualAccommodation?: boolean
      roomWishes?: string[]
      targetTermId?: string
    } = {},
  ): Promise<string> => {
    counter += 1
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId,
        accessToken: randomUUID(),
        firstName,
        lastName,
        birthDate: new Date("2010-01-01"),
        gender,
        email: `us147-${counter}@example.com`,
        consentAt: new Date(),
        individualAccommodation: extra.individualAccommodation ?? false,
        terms: {
          create: [
            {
              organizationId,
              termId: extra.targetTermId ?? termId,
              status: extra.status ?? "CONFIRMED",
              priceCzk: 1000,
              roomWishes: extra.roomWishes ?? [],
            },
          ],
        },
      },
      include: { terms: true },
    })
    return application.terms[0]!.id
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    participantCookie = await signIn("ucastnik@example.com", "password4")
    foreignCookie = await signIn("organizator2@example.com", "password2")
    const member = await prisma.organizationMember.findFirstOrThrow({
      where: { user: { email: "organizator@example.com" } },
    })
    organizationId = member.organizationId
    const event = await prisma.event.create({
      data: { organizationId, name: "US-147", publicToken: `us147-${randomUUID()}` },
    })
    eventId = event.id
    termId = (
      await prisma.term.create({
        data: {
          organizationId,
          eventId,
          number: 1,
          name: "T1",
          startsOn: new Date("2027-07-01"),
          endsOn: new Date("2027-07-08"),
          priceCzk: 1000,
        },
      })
    ).id
    girlsRoom = (
      await prisma.room.create({
        data: { organizationId, termId, name: "Dámský", capacity: 3, gender: "FEMALE" },
      })
    ).id
    boysRoom = (
      await prisma.room.create({
        data: { organizationId, termId, name: "Pánský", capacity: 1, gender: "MALE" },
      })
    ).id
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("protects both endpoints by session, role and organization", async () => {
    const body = { assignments: [{ applicationTermId: "x", roomId: "y" }] }
    for (const path of [`${base()}/proposal`, `${base()}/bulk`]) {
      expect((await call(path, "POST", body, "")).status).toBe(401)
      expect((await call(path, "POST", body, participantCookie)).status).toBe(403)
      expect((await call(path, "POST", body, foreignCookie)).status).toBe(403)
    }
  })

  it("proposes without saving, leaves out individual accommodation and fulfils wishes", async () => {
    const jana = await makePerson("Jana", "Nováková", "FEMALE", { roomWishes: ["Eva Černá"] })
    const eva = await makePerson("Eva", "Černá", "FEMALE")
    const tomas = await makePerson("Tomáš", "Novotný", "MALE")
    const martin = await makePerson("Martin", "Beneš", "MALE")
    const solo = await makePerson("Lucie", "Veselá", "FEMALE", { individualAccommodation: true })
    await makePerson("Wait", "Listed", "FEMALE", { status: "WAITLISTED" })
    const proposal = await propose()
    const roomOf = (id: string) =>
      proposal.placements.find((p) => p.applicationTermId === id)?.roomId
    expect(roomOf(jana)).toBe(girlsRoom)
    expect(roomOf(eva)).toBe(girlsRoom)
    // One bed for two boys: exactly one of them gets it.
    expect([roomOf(tomas), roomOf(martin)].filter((id) => id === boysRoom)).toHaveLength(1)
    const noBed = roomOf(tomas) ? martin : tomas
    expect(proposal.placements).toHaveLength(3)
    expect(proposal.unplaced).toEqual(
      expect.arrayContaining([
        { applicationTermId: solo, reason: "INDIVIDUAL_ACCOMMODATION" },
        { applicationTermId: noBed, reason: "NO_FREE_BED" },
      ]),
    )
    expect(proposal.wishes).toEqual([
      expect.objectContaining({ applicationTermId: jana, name: "Eva Černá", fulfilled: true }),
    ])
    expect(await prisma.roomAssignment.count({ where: { room: { termId } } })).toBe(0)
  })

  it("saves a proposal in one transaction and refuses a stale one without saving anything", async () => {
    const proposal = await propose()
    const [first, second] = proposal.placements
    // Somebody takes the first person's bed meanwhile: the whole proposal fails.
    await prisma.roomAssignment.create({
      data: { organizationId, applicationTermId: first!.applicationTermId, roomId: first!.roomId },
    })
    const stale = await call(`${base()}/bulk`, "POST", { assignments: proposal.placements })
    expect(stale.status).toBe(409)
    expect(((await stale.json()) as { code: string }).code).toBe("ROOM_PROPOSAL_OUTDATED")
    expect(
      await prisma.roomAssignment.findUnique({
        where: { applicationTermId: second!.applicationTermId },
      }),
    ).toBeNull()
    await prisma.roomAssignment.deleteMany({ where: { room: { termId } } })

    const saved = await call(`${base()}/bulk`, "POST", { assignments: proposal.placements })
    expect(saved.status).toBe(204)
    expect(await prisma.roomAssignment.count({ where: { room: { termId } } })).toBe(
      proposal.placements.length,
    )
  })

  it("never overfills a room or puts the other gender in a gendered room when saving", async () => {
    await prisma.roomAssignment.deleteMany({ where: { room: { termId } } })
    const boy = await makePerson("Bob", "Boy", "MALE")
    const other = await makePerson("Ota", "Other", "MALE")
    const wrongGender = await call(`${base()}/bulk`, "POST", {
      assignments: [{ applicationTermId: boy, roomId: girlsRoom }],
    })
    expect(wrongGender.status).toBe(409)
    const solo = await makePerson("Sam", "Solo", "MALE", { individualAccommodation: true })
    const individual = await call(`${base()}/bulk`, "POST", {
      assignments: [{ applicationTermId: solo, roomId: boysRoom }],
    })
    expect(individual.status).toBe(409)
    expect(((await individual.json()) as { code: string }).code).toBe("ROOM_PROPOSAL_OUTDATED")
    const full = await call(`${base()}/bulk`, "POST", {
      assignments: [
        { applicationTermId: boy, roomId: boysRoom },
        { applicationTermId: other, roomId: boysRoom },
      ],
    })
    expect(full.status).toBe(409)
    expect(((await full.json()) as { code: string }).code).toBe("ROOM_FULL")
    expect((await prisma.room.findUniqueOrThrow({ where: { id: boysRoom } })).extraBeds).toBe(0)
    expect(await prisma.roomAssignment.count({ where: { room: { termId } } })).toBe(0)
  })

  // US-145: a room that became individual after the proposal is no target any more.
  it("refuses to save a proposal into an individual room", async () => {
    const family = await prisma.room.create({
      data: { organizationId, termId, name: "Rodinný US-145", capacity: 4, individual: true },
    })
    const girl = await makePerson("Iva", "Rodinná", "FEMALE")
    const response = await call(`${base()}/bulk`, "POST", {
      assignments: [{ applicationTermId: girl, roomId: family.id }],
    })
    expect(response.status).toBe(409)
    expect(((await response.json()) as { code: string }).code).toBe("ROOM_PROPOSAL_OUTDATED")
    expect(await prisma.roomAssignment.count({ where: { roomId: family.id } })).toBe(0)
    await prisma.room.delete({ where: { id: family.id } })
  })

  it.each(["GENDERED", "SHARED"] as const)(
    "keeps a regular room with an individual accommodation request manual in %s mode",
    async (roomMode) => {
      const { id: targetTermId } = await prisma.term.create({
        data: {
          organizationId,
          eventId,
          number: roomMode === "GENDERED" ? 2 : 3,
          startsOn: new Date("2027-07-01"),
          endsOn: new Date("2027-07-08"),
          priceCzk: 1000,
          roomMode,
        },
      })
      const room = await prisma.room.create({
        data: {
          organizationId,
          termId: targetTermId,
          name: "A",
          capacity: 3,
          gender: roomMode === "GENDERED" ? "FEMALE" : null,
        },
      })
      const candidate = await makePerson("Eva", "Černá", "FEMALE", { targetTermId })
      const resident = await makePerson("Jana", "Nováková", "FEMALE", {
        targetTermId,
        individualAccommodation: true,
      })
      const initial = await propose(targetTermId)
      expect(initial.placements).toEqual([{ applicationTermId: candidate, roomId: room.id }])

      // Manual placement remains possible. It makes the outstanding automatic proposal stale.
      const path = base(targetTermId)
      expect((await call(`${path}/${resident}`, "PUT", { roomId: room.id })).status).toBe(204)
      const fresh = await propose(targetTermId)
      expect(fresh.placements).toEqual([])
      expect(fresh.unplaced).toEqual([{ applicationTermId: candidate, reason: "NO_FREE_BED" }])

      const stale = await call(`${path}/bulk`, "POST", { assignments: initial.placements })
      expect(stale.status).toBe(409)
      expect(((await stale.json()) as { code: string }).code).toBe("ROOM_PROPOSAL_OUTDATED")
      expect(await prisma.roomAssignment.count({ where: { roomId: room.id } })).toBe(1)
      expect((await call(`${path}/${candidate}`, "PUT", { roomId: room.id })).status).toBe(204)
    },
  )
})
