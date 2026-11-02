import { PrismaService } from "@/core/prisma/prisma.service"
import { EventCapacityDetails, TermCapacity } from "@/modules/applications/domain/event-capacity"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

describe("read-only term capacity (integration)", () => {
  let prisma: PrismaService
  let eventId: string
  let termIds: string[]
  let cookie: string
  const read = (session = cookie, id = eventId): Promise<Response> =>
    fetch(api(`/organizer/events/${id}/capacity`), { headers: { Cookie: session } })
  // Rooms of the first term unless another one is given.
  const roomsRequest = (
    path: string,
    method: string,
    body?: unknown,
    termId = termIds[0],
  ): Promise<Response> =>
    fetch(api(`/organizer/events/${eventId}/terms/${termId}/${path}`), {
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
    termIds = (
      await prisma.term.findMany({ where: { eventId }, orderBy: { startsOn: "asc" } })
    ).map((term) => term.id)
    await prisma.room.deleteMany({ where: { term: { eventId } } })
    await prisma.room.createMany({
      data: termIds.flatMap((termId) =>
        (["FEMALE", "MALE"] as const).flatMap((gender) =>
          Array.from({ length: 10 }, (_, index) => ({
            termId,
            organizationId: event.organizationId,
            name: `${gender}-${index}`,
            gender,
            capacity: 5,
          })),
        ),
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
  it("excludes cancelled terms from both capacity endpoints while retaining their confirmations", async () => {
    const original = (await (await read()).json()) as TermCapacity[]
    const cancelledId = original[0].termId
    const confirmations = await prisma.applicationTerm.findMany({
      where: { termId: cancelledId, status: "CONFIRMED" },
      orderBy: { id: "asc" },
    })
    expect(confirmations.length).toBeGreaterThan(0)
    await prisma.term.update({ where: { id: cancelledId }, data: { cancelledAt: new Date() } })

    const response = await read()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(original.slice(1))
    const details = await fetch(api(`/organizer/events/${eventId}/capacity/details`), {
      headers: { Cookie: cookie },
    })
    expect(details.status).toBe(200)
    expect(
      ((await details.json()) as EventCapacityDetails).terms.map((term) => term.termId),
    ).toEqual(original.slice(1).map((term) => term.termId))
    expect(
      await prisma.applicationTerm.findMany({
        where: { termId: cancelledId, status: "CONFIRMED" },
        orderBy: { id: "asc" },
      }),
    ).toEqual(confirmations)

    await prisma.term.updateMany({ where: { eventId }, data: { cancelledAt: new Date() } })
    expect(await (await read()).json()).toEqual([])
    const emptyDetails = await fetch(api(`/organizer/events/${eventId}/capacity/details`), {
      headers: { Cookie: cookie },
    })
    expect(((await emptyDetails.json()) as EventCapacityDetails).terms).toEqual([])
  })
  it("reflects a room change in its own term only, without changing confirmations", async () => {
    const original = (await (await read()).json()) as TermCapacity[]
    const statuses = await prisma.applicationTerm.findMany({
      where: { term: { eventId } },
      orderBy: { id: "asc" },
    })
    const room = await prisma.room.findFirstOrThrow({
      where: { termId: termIds[0], gender: "FEMALE" },
    })
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
    expect(changed[0].capacity).toEqual({ FEMALE: 5045, MALE: 50 })
    expect(changed[0].freePlaces.FEMALE).toBe(original[0].freePlaces.FEMALE + 4995)
    expect(changed[1]).toEqual(original[1])
    expect((await roomsRequest(`rooms/${room.id}`, "DELETE")).status).toBe(204)
    expect(
      (await roomsRequest("rooms", "POST", { name: "Additional", gender: "FEMALE", capacity: 4 }))
        .status,
    ).toBe(204)
    expect(
      ((await (await read()).json()) as TermCapacity[]).map((term) => term.capacity.FEMALE),
    ).toEqual([49, 50])
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
  it("shows overbooking after room deletion in a term without moving participants", async () => {
    const rooms = await prisma.room.findMany({ where: { termId: termIds[0], gender: "FEMALE" } })
    for (const room of rooms)
      expect((await roomsRequest(`rooms/${room.id}`, "DELETE")).status).toBe(204)
    const terms = (await (await read()).json()) as TermCapacity[]
    expect(terms[0].capacity).toEqual({ FEMALE: 0, MALE: 50 })
    expect(terms[0].freePlaces.FEMALE).toBeLessThan(0)
    expect(terms[1].capacity).toEqual({ FEMALE: 50, MALE: 50 })
  })
  it("gives each term its own room mode and capacity", async () => {
    expect((await roomsRequest("room-mode", "PATCH", { roomMode: "SHARED" })).status).toBe(204)
    const response = await fetch(api(`/organizer/events/${eventId}/capacity/details`), {
      headers: { Cookie: cookie },
    })
    expect(response.status).toBe(200)
    const details = (await response.json()) as EventCapacityDetails
    expect(details.terms[0].roomMode).toBe("SHARED")
    expect(details.terms[0].rooms.every((room) => room.gender === null)).toBe(true)
    expect(details.terms[0].capacity).toEqual({ FEMALE: 100, MALE: 100 })
    expect(details.terms[1].roomMode).toBe("GENDERED")
    expect(details.terms[1].capacity).toEqual({ FEMALE: 50, MALE: 50 })
    const terms = (await (await read()).json()) as TermCapacity[]
    expect(terms.map((term) => term.roomMode)).toEqual(["SHARED", "GENDERED"])
  })
  it("does not expose a room mutation endpoint in US-26", async () => {
    const before = await prisma.room.findMany({
      where: { term: { eventId } },
      orderBy: { id: "asc" },
    })
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
    expect(
      await prisma.room.findMany({ where: { term: { eventId } }, orderBy: { id: "asc" } }),
    ).toEqual(before)
  })
})
