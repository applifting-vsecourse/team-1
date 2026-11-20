import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type Gender = "FEMALE" | "MALE"
type Status = "CONFIRMED" | "WAITLISTED"
type Rooms = {
  rooms: { id: string; name: string; gender: Gender | null; individual: boolean; beds: number }[]
  capacity: { FEMALE: number; MALE: number; total: number; individualBeds: number }
}
type Assignments = {
  warnings: { kind: string; roomId: string | null }[]
  summary: { violations: number }
}

// US-145: an individual (mixed, family) room of a gendered term.
describe("individual rooms (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let foreignCookie: string
  let organizationId: string
  let eventId: string
  let termId: string
  let sharedTermId: string
  let counter = 0

  const call = (path: string, method = "GET", body?: unknown, session = cookie) =>
    fetch(api(`/organizer/events/${eventId}/terms/${path}`), {
      method,
      headers: { Cookie: session, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  const rooms = async (term = termId) => (await (await call(`${term}/rooms`)).json()) as Rooms
  const warnings = async () =>
    (await (await call(`${termId}/room-assignments`)).json()) as Assignments
  const freePlaces = async () => {
    const response = await fetch(api(`/organizer/events/${eventId}/capacity`), {
      headers: { Cookie: cookie },
    })
    const terms = (await response.json()) as {
      termId: string
      capacity: { FEMALE: number; MALE: number }
      freePlaces: { FEMALE: number; MALE: number }
    }[]
    return terms.find((term) => term.termId === termId)
  }
  const makeParticipant = async (gender: Gender, status: Status): Promise<string> => {
    counter += 1
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId,
        accessToken: randomUUID(),
        firstName: "Test",
        lastName: `Osoba${counter}`,
        birthDate: new Date("1990-01-01"),
        gender,
        email: `us145-${counter}@example.com`,
        consentAt: new Date(),
        terms: { create: [{ organizationId, termId, status, priceCzk: 1000 }] },
      },
      include: { terms: true },
    })
    return application.terms[0].id
  }
  const statuses = async () =>
    Object.fromEntries(
      (await prisma.applicationTerm.findMany({ where: { termId }, orderBy: { id: "asc" } })).map(
        (row) => [row.id, row.status],
      ),
    )

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    foreignCookie = await signIn("organizator2@example.com", "password2")
    const member = await prisma.organizationMember.findFirstOrThrow({
      where: { user: { email: "organizator@example.com" } },
    })
    organizationId = member.organizationId
    const event = await prisma.event.create({
      data: { organizationId, name: "US-145", publicToken: `us145-${randomUUID()}` },
    })
    eventId = event.id
    const makeTerm = async (number: number, roomMode: "GENDERED" | "SHARED") =>
      (
        await prisma.term.create({
          data: {
            organizationId,
            eventId,
            number,
            name: `T${number}`,
            startsOn: new Date(`2027-07-0${number}`),
            endsOn: new Date(`2027-07-0${number}`),
            priceCzk: 1000,
            roomMode,
          },
        })
      ).id
    termId = await makeTerm(1, "GENDERED")
    sharedTermId = await makeTerm(2, "SHARED")
    await call(`${termId}/rooms`, "POST", { name: "Dívky", capacity: 1, gender: "FEMALE" })
    await call(`${termId}/rooms`, "POST", { name: "Kluci", capacity: 1, gender: "MALE" })
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("creates an individual room without a gender; empty, it adds nothing to the capacity", async () => {
    const created = await call(`${termId}/rooms`, "POST", {
      name: "Rodinný",
      capacity: 4,
      individual: true,
    })
    expect(created.status).toBe(204)
    const listing = await rooms()
    const room = listing.rooms.find((item) => item.name === "Rodinný")
    expect(room).toMatchObject({ gender: null, individual: true, beds: 4 })
    expect(room).not.toHaveProperty("assignments")
    expect(listing.capacity).toEqual({ FEMALE: 1, MALE: 1, total: 2, individualBeds: 4 })
  })

  it("rejects an individual room with a gender and one in a term with shared rooms", async () => {
    const withGender = await call(`${termId}/rooms`, "POST", {
      name: "S pohlavím",
      capacity: 2,
      gender: "MALE",
      individual: true,
    })
    expect(withGender.status).toBe(400)
    const shared = await call(`${sharedTermId}/rooms`, "POST", {
      name: "Společný",
      capacity: 2,
      individual: true,
    })
    expect(shared.status).toBe(400)
    expect((await rooms(sharedTermId)).rooms).toEqual([])
  })

  it("changes no free places while the individual room is empty", async () => {
    expect(await freePlaces()).toMatchObject({
      capacity: { FEMALE: 1, MALE: 1 },
      freePlaces: { FEMALE: 1, MALE: 1 },
    })
  })

  it("takes a man and a woman without a mixed-gender warning, still warns about overfilling", async () => {
    const individual = (await rooms()).rooms.find((room) => room.individual)!
    const man = await makeParticipant("MALE", "CONFIRMED")
    const woman = await makeParticipant("FEMALE", "CONFIRMED")
    for (const applicationTermId of [man, woman]) {
      const response = await call(`${termId}/room-assignments/${applicationTermId}`, "PUT", {
        roomId: individual.id,
      })
      expect(response.status).toBe(204)
    }
    expect((await warnings()).warnings).toEqual([])
    // Their beds count into the capacity of their gender, so they take no regular place (variant b).
    expect((await rooms()).capacity).toEqual({ FEMALE: 2, MALE: 2, total: 4, individualBeds: 4 })
    expect(await freePlaces()).toMatchObject({
      capacity: { FEMALE: 2, MALE: 2 },
      freePlaces: { FEMALE: 1, MALE: 1 },
    })

    await prisma.room.update({ where: { id: individual.id }, data: { capacity: 1 } })
    const overfilled = await warnings()
    expect(overfilled.warnings).toMatchObject([{ kind: "OVERCROWDED", roomId: individual.id }])
    await prisma.room.update({ where: { id: individual.id }, data: { capacity: 4 } })
  })

  it("sets and clears the flag after evaluation without changing any application", async () => {
    await makeParticipant("FEMALE", "CONFIRMED")
    const waitlisted = await makeParticipant("FEMALE", "WAITLISTED")
    const before = await statuses()
    const plain = (await rooms()).rooms.find((room) => room.name === "Dívky")!

    const set = await call(`${termId}/rooms/${plain.id}`, "PUT", {
      name: "Dívky",
      capacity: 1,
      individual: true,
    })
    expect(set.status).toBe(204)
    expect((await rooms()).rooms.find((room) => room.id === plain.id)).toMatchObject({
      individual: true,
      gender: null,
    })
    expect(await statuses()).toEqual(before)

    const cleared = await call(`${termId}/rooms/${plain.id}`, "PUT", {
      name: "Dívky",
      capacity: 1,
      gender: "FEMALE",
      individual: false,
    })
    expect(cleared.status).toBe(204)
    expect((await rooms()).rooms.find((room) => room.id === plain.id)).toMatchObject({
      individual: false,
      gender: "FEMALE",
    })
    // Nobody is moved up from the waitlist, the statuses are the same as before (D-108).
    expect(await statuses()).toEqual(before)
    expect((await statuses())[waitlisted]).toBe("WAITLISTED")
  })

  it("keeps the assignments when the flag of an occupied room is cleared", async () => {
    const individual = (await rooms()).rooms.find((room) => room.name === "Rodinný")!
    const before = await prisma.roomAssignment.count({ where: { roomId: individual.id } })
    expect(before).toBe(2)
    const response = await call(`${termId}/rooms/${individual.id}`, "PUT", {
      name: "Rodinný",
      capacity: 4,
      gender: "MALE",
      individual: false,
    })
    expect(response.status).toBe(204)
    expect(await prisma.roomAssignment.count({ where: { roomId: individual.id } })).toBe(before)
    // The usual rule applies again: a woman sleeps in a men's room.
    const mixed = (await warnings()).warnings.filter((item) => item.kind === "MIXED_GENDER")
    expect(mixed).toMatchObject([{ roomId: individual.id }])
  })

  it("turns individual rooms into shared ones when the term switches to shared rooms", async () => {
    await prisma.room.update({
      where: { id: (await rooms()).rooms.find((room) => room.name === "Rodinný")!.id },
      data: { gender: null, individual: true },
    })
    const response = await call(`${termId}/room-mode`, "PATCH", { roomMode: "SHARED" })
    expect(response.status).toBe(204)
    const listing = await rooms()
    expect(listing.rooms.every((room) => !room.individual && room.gender === null)).toBe(true)
    expect(listing.capacity.individualBeds).toBe(0)
  })

  it("protects the flag by organization", async () => {
    const room = (await rooms()).rooms[0]
    const foreign = await call(
      `${termId}/rooms/${room.id}`,
      "PUT",
      { name: "X", capacity: 1, individual: true },
      foreignCookie,
    )
    expect(foreign.status).toBe(403)
    // Like every room route, an unknown room answers 403 (the existing convention of rooms).
    const missing = await call(`${termId}/rooms/does-not-exist`, "PUT", { name: "X", capacity: 1 })
    expect(missing.status).toBe(403)
    expect((await rooms()).rooms.find((item) => item.id === room.id)?.name).not.toBe("X")
  })
})
