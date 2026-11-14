import { PrismaService } from "@/core/prisma/prisma.service"
import { TermRooms } from "@/modules/events/domain/rooms"
import {
  api,
  connectTestPrisma,
  nextTermNumber,
  resetAndSeed,
  signIn,
} from "@/test/integration/test-api"

type TermCapacity = {
  termId: string
  capacity: { FEMALE: number; MALE: number }
  freePlaces: { FEMALE: number; MALE: number }
}

describe("extra beds of a room (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let eventId: string
  let termId: string
  let otherTermId: string
  let roomId: string
  let foreignId: string

  const call = (term: string, path: string, method = "GET", body?: unknown, session = cookie) =>
    fetch(api(`/organizer/events/${eventId}/terms/${term}${path}`), {
      method,
      headers: { Cookie: session, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  const setExtraBeds = (extraBeds: unknown, id = roomId, term = termId, session = cookie) =>
    call(term, `/rooms/${id}/extra-beds`, "PATCH", { extraBeds }, session)
  const rooms = async (term: string) => (await (await call(term, "/rooms")).json()) as TermRooms
  const capacities = async (): Promise<Record<string, TermCapacity>> => {
    const response = await fetch(api(`/organizer/events/${eventId}/capacity`), {
      headers: { Cookie: cookie },
    })
    const terms = (await response.json()) as TermCapacity[]
    return Object.fromEntries(terms.map((term) => [term.termId, term]))
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    const member = await prisma.organizationMember.findFirstOrThrow({
      where: { user: { email: "organizator@example.com" } },
    })
    const event = await prisma.event.create({
      data: {
        organizationId: member.organizationId,
        name: "Extra beds test",
        publicToken: "extra-beds-integration-test",
      },
    })
    eventId = event.id
    const makeTerm = async (name: string, startsOn: string, endsOn: string) =>
      prisma.term.create({
        data: {
          organizationId: member.organizationId,
          eventId,
          number: await nextTermNumber(prisma, eventId),
          name,
          startsOn: new Date(startsOn),
          endsOn: new Date(endsOn),
          priceCzk: 1000,
        },
      })
    termId = (await makeTerm("First", "2027-06-01", "2027-06-07")).id
    otherTermId = (await makeTerm("Second", "2027-06-08", "2027-06-14")).id
    for (const term of [termId, otherTermId]) {
      await call(term, "/rooms", "POST", { name: "A1", capacity: 4, gender: "FEMALE" })
    }
    roomId = (await rooms(termId)).rooms[0].id
    foreignId = (
      await prisma.room.findFirstOrThrow({
        where: { organizationId: { not: member.organizationId } },
      })
    ).id
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("starts with no extra beds", async () => {
    expect((await rooms(termId)).rooms[0]).toMatchObject({ capacity: 4, extraBeds: 0 })
  })

  it("adds any number of extra beds to the room, the women's group and the free beds of this term only", async () => {
    expect((await setExtraBeds(2)).status).toBe(204)
    const [room] = (await rooms(termId)).rooms
    expect(room).toMatchObject({ capacity: 4, extraBeds: 2, beds: 6 })
    expect((await rooms(termId)).capacity).toEqual({ FEMALE: 6, MALE: 0, total: 6 })
    const terms = await capacities()
    expect(terms[termId].capacity).toEqual({ FEMALE: 6, MALE: 0 })
    expect(terms[termId].freePlaces).toEqual({ FEMALE: 6, MALE: 0 })
    expect(terms[otherTermId].capacity).toEqual({ FEMALE: 4, MALE: 0 })
    expect((await rooms(otherTermId)).rooms[0].extraBeds).toBe(0)
  })

  it("takes the extra beds back", async () => {
    expect((await setExtraBeds(0)).status).toBe(204)
    expect((await capacities())[termId].capacity).toEqual({ FEMALE: 4, MALE: 0 })
  })

  it("counts the extra beds once in the shared pool", async () => {
    expect((await call(termId, "/room-mode", "PATCH", { roomMode: "SHARED" })).status).toBe(204)
    expect((await setExtraBeds(3)).status).toBe(204)
    expect((await rooms(termId)).capacity).toEqual({ FEMALE: 0, MALE: 0, total: 7 })
    expect((await capacities())[termId].freePlaces).toEqual({ FEMALE: 7, MALE: 7 })
    await call(termId, "/room-mode", "PATCH", {
      roomMode: "GENDERED",
      rooms: [{ id: roomId, gender: "FEMALE" }],
    })
    await setExtraBeds(0)
  })

  it("keeps the extra beds when the room is edited and does not copy them", async () => {
    await setExtraBeds(2)
    expect(
      (await call(termId, `/rooms/${roomId}`, "PUT", { name: "A1", capacity: 5, gender: "FEMALE" }))
        .status,
    ).toBe(204)
    expect((await rooms(termId)).rooms[0]).toMatchObject({ capacity: 5, extraBeds: 2 })
    const copy = await call(otherTermId, "/rooms/copy", "POST", {
      sourceTermId: termId,
      strategy: "REPLACE",
    })
    expect(copy.status).toBe(204)
    expect((await rooms(otherTermId)).rooms[0]).toMatchObject({ capacity: 5, extraBeds: 0 })
    await setExtraBeds(0)
  })

  it.each([-1, 1.5, "2", null, 2147483648])("rejects %s extra beds", async (value) => {
    expect((await setExtraBeds(value)).status).toBe(400)
    expect((await rooms(termId)).rooms[0].extraBeds).toBe(0)
  })

  it("rejects a missing body field and extra fields", async () => {
    expect((await call(termId, `/rooms/${roomId}/extra-beds`, "PATCH", {})).status).toBe(400)
    expect(
      (await call(termId, `/rooms/${roomId}/extra-beds`, "PATCH", { extraBeds: 1, capacity: 9 }))
        .status,
    ).toBe(400)
  })

  it("protects the change by session, role and organization", async () => {
    expect((await setExtraBeds(1, roomId, termId, "")).status).toBe(401)
    const participant = await signIn("ucastnik@example.com", "password4")
    expect((await setExtraBeds(1, roomId, termId, participant)).status).toBe(403)
    const other = await signIn("organizator2@example.com", "password2")
    expect((await setExtraBeds(1, roomId, termId, other)).status).toBe(403)
    expect((await setExtraBeds(1, foreignId)).status).toBe(403)
    // A room of another term of the event is a foreign record in this one.
    expect((await setExtraBeds(1, roomId, otherTermId)).status).toBe(403)
    expect(await prisma.room.findUnique({ where: { id: foreignId } })).toMatchObject({
      extraBeds: 0,
    })
  })

  it("serializes concurrent changes under the event lock", async () => {
    const responses = await Promise.all([setExtraBeds(1), setExtraBeds(2), setExtraBeds(3)])
    expect(responses.map((response) => response.status)).toEqual([204, 204, 204])
    expect([1, 2, 3]).toContain((await rooms(termId)).rooms[0].extraBeds)
  })
})
