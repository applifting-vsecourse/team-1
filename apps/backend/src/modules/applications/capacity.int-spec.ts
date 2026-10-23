import { PrismaService } from "@/core/prisma/prisma.service"
import { EventCapacityDetails, TermCapacity } from "@/modules/applications/domain/event-capacity"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

describe("read-only term capacity (integration)", () => {
  let prisma: PrismaService
  let eventId: string
  let cookie: string
  const read = (session = cookie, id = eventId): Promise<Response> =>
    fetch(api(`/organizer/events/${id}/capacity`), { headers: { Cookie: session } })
  const roomsRequest = (path: string, method: string, body?: unknown): Promise<Response> =>
    fetch(api(`/organizer/events/${eventId}/${path}`), {
      method,
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  beforeAll(async () => {
    prisma = await connectTestPrisma()
  })
  beforeEach(async () => {
    await resetAndSeed(prisma)
    const event = await prisma.event.findUniqueOrThrow({
      where: { publicToken: "demo-letni-kemp-2027" },
    })
    eventId = event.id
    await prisma.room.deleteMany({ where: { eventId } })
    await prisma.room.createMany({
      data: (["FEMALE", "MALE"] as const).flatMap((gender) =>
        Array.from({ length: 10 }, (_, index) => ({
          eventId,
          organizationId: event.organizationId,
          name: `${gender}-${index}`,
          gender,
          capacity: 5,
        })),
      ),
    })
    cookie = await signIn("organizator@example.com", "password1")
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })
  it("requires an organizer session and membership", async () => {
    expect((await read("")).status).toBe(401)
    expect((await read(await signIn("ucastnik@example.com", "password4"))).status).toBe(403)
    expect((await read(await signIn("organizator2@example.com", "password2"))).status).toBe(403)
    expect((await read(cookie, "missing")).status).toBe(403)
  })
  it("counts confirmed participants separately in each term and gender", async () => {
    const response = await read()
    expect(response.status).toBe(200)
    const terms = (await response.json()) as TermCapacity[]
    expect(terms).toHaveLength(2)
    for (const term of terms) {
      expect(term.capacity).toEqual({ FEMALE: 50, MALE: 50 })
      for (const gender of ["FEMALE", "MALE"] as const) {
        const confirmed = await prisma.applicationTerm.count({
          where: { termId: term.termId, status: "CONFIRMED", application: { gender } },
        })
        expect(term.freePlaces[gender]).toBe(50 - confirmed)
      }
    }
  })
  it("reflects changes through US-14 rooms API without changing confirmations", async () => {
    const original = (await (await read()).json()) as TermCapacity[]
    const statuses = await prisma.applicationTerm.findMany({
      where: { term: { eventId } },
      orderBy: { id: "asc" },
    })
    const room = await prisma.room.findFirstOrThrow({ where: { eventId, gender: "FEMALE" } })
    expect(
      (
        await roomsRequest(`rooms/${room.id}`, "PUT", {
          name: room.name,
          gender: "FEMALE",
          capacity: 5000,
        })
      ).status,
    ).toBe(204)
    const changed = (await (await read()).json()) as TermCapacity[]
    for (const [index, term] of changed.entries()) {
      expect(term.capacity).toEqual({ FEMALE: 5045, MALE: 50 })
      expect(term.freePlaces.FEMALE).toBe(original[index].freePlaces.FEMALE + 4995)
    }
    expect((await roomsRequest(`rooms/${room.id}`, "DELETE")).status).toBe(204)
    expect(
      (await roomsRequest("rooms", "POST", { name: "Additional", gender: "FEMALE", capacity: 4 }))
        .status,
    ).toBe(204)
    expect(
      ((await (await read()).json()) as TermCapacity[]).every(
        (term) => term.capacity.FEMALE === 49,
      ),
    ).toBe(true)
    expect(
      await prisma.applicationTerm.findMany({
        where: { term: { eventId } },
        orderBy: { id: "asc" },
      }),
    ).toEqual(statuses)
    const details = (await (
      await fetch(api(`/organizer/events/${eventId}/capacity/details`), {
        headers: { Cookie: cookie },
      })
    ).json()) as EventCapacityDetails
    expect(details.terms[0]).toMatchObject({
      name: "1. týden",
      startsOn: "2027-07-04",
      endsOn: "2027-07-10",
    })
  })
  it("shows overbooking after room deletion in US-14 without moving participants", async () => {
    const rooms = await prisma.room.findMany({ where: { eventId, gender: "FEMALE" } })
    for (const room of rooms)
      expect((await roomsRequest(`rooms/${room.id}`, "DELETE")).status).toBe(204)
    const terms = (await (await read()).json()) as TermCapacity[]
    expect(terms.every((term) => term.capacity.FEMALE === 0 && term.capacity.MALE === 50)).toBe(
      true,
    )
    expect(terms.some((term) => term.freePlaces.FEMALE < 0)).toBe(true)
  })
  it("identifies shared events without replacing their US-14 management", async () => {
    expect((await roomsRequest("room-mode", "PATCH", { roomMode: "SHARED" })).status).toBe(204)
    const response = await fetch(api(`/organizer/events/${eventId}/capacity/details`), {
      headers: { Cookie: cookie },
    })
    expect(response.status).toBe(200)
    const details = (await response.json()) as EventCapacityDetails
    expect(details.roomMode).toBe("SHARED")
    expect(details.terms).toEqual([])
    expect(details.rooms.every((room) => room.gender === null)).toBe(true)
    expect((await read()).status).toBe(409)
    expect((await roomsRequest("rooms", "GET")).status).toBe(200)
  })
  it("does not expose a room mutation endpoint in US-26", async () => {
    const before = await prisma.room.findMany({ where: { eventId }, orderBy: { id: "asc" } })
    const response = await fetch(api(`/organizer/events/${eventId}/capacity/rooms`), {
      method: "PATCH",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        gender: "FEMALE",
        originalCapacity: 5,
        expectedCount: 10,
        count: 1,
        capacity: 1,
      }),
    })
    expect(response.status).toBe(404)
    expect(await prisma.room.findMany({ where: { eventId }, orderBy: { id: "asc" } })).toEqual(
      before,
    )
  })
})
