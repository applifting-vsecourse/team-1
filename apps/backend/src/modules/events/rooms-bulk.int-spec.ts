import { PrismaService } from "@/core/prisma/prisma.service"
import { TermRooms } from "@/modules/events/domain/rooms"
import {
  api,
  connectTestPrisma,
  nextTermNumber,
  resetAndSeed,
  signIn,
} from "@/test/integration/test-api"

describe("bulk room creation (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let participantCookie: string
  let eventId: string
  let organizationId: string
  let gendered: string
  let shared: string
  let foreignTerm: string
  const call = (termId: string, path: string, method = "GET", body?: unknown, session = cookie) =>
    fetch(api(`/organizer/events/${eventId}/terms/${termId}${path}`), {
      method,
      headers: { Cookie: session, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  const bulk = (termId: string, body: unknown, session = cookie) =>
    call(termId, "/rooms/bulk", "POST", body, session)
  const rooms = async (termId: string) => (await (await call(termId, "/rooms")).json()) as TermRooms

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    participantCookie = await signIn("ucastnik@example.com", "password4")
    const member = await prisma.organizationMember.findFirstOrThrow({
      where: { user: { email: "organizator@example.com" } },
    })
    organizationId = member.organizationId
    eventId = (
      await prisma.event.create({
        data: { organizationId, name: "Bulk test", publicToken: "rooms-bulk-integration-test" },
      })
    ).id
    const makeTerm = async (name: string, day: number, roomMode: "GENDERED" | "SHARED") =>
      (
        await prisma.term.create({
          data: {
            organizationId,
            eventId,
            number: await nextTermNumber(prisma, eventId),
            name,
            roomMode,
            startsOn: new Date(`2027-06-${day}`),
            endsOn: new Date(`2027-06-${day + 5}`),
            priceCzk: 1000,
          },
        })
      ).id
    gendered = await makeTerm("Gendered", 1, "GENDERED")
    shared = await makeTerm("Shared", 8, "SHARED")
    foreignTerm = (
      await prisma.term.findFirstOrThrow({ where: { organizationId: { not: organizationId } } })
    ).id
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("protects the endpoint by session, role and organization", async () => {
    const body = { count: 2, capacity: 4, firstNumber: 1, gender: "FEMALE" }
    expect((await bulk(gendered, body, "")).status).toBe(401)
    expect((await bulk(gendered, body, participantCookie)).status).toBe(403)
    const otherCookie = await signIn("organizator2@example.com", "password2")
    expect((await bulk(gendered, body, otherCookie)).status).toBe(403)
    expect((await bulk(foreignTerm, body)).status).toBe(403)
    expect((await rooms(gendered)).rooms).toEqual([])
  })

  it("rejects invalid input and a gender that does not match the room mode", async () => {
    const valid = { count: 2, capacity: 4, firstNumber: 1, gender: "FEMALE" }
    for (const patch of [
      { count: 0 },
      { count: 201 },
      { count: 1.5 },
      { capacity: 0 },
      { firstNumber: 0 },
      { firstNumber: 1_000_000 },
      { gender: "OTHER" },
      { extra: true },
    ]) {
      expect((await bulk(gendered, { ...valid, ...patch })).status).toBe(400)
    }
    expect((await bulk(gendered, { count: 2, capacity: 4, firstNumber: 1 })).status).toBe(400)
    expect((await bulk(shared, valid)).status).toBe(400)
    expect((await rooms(gendered)).rooms).toEqual([])
    expect((await rooms(shared)).rooms).toEqual([])
  })

  it("creates numbered gendered rooms and recalculates the capacity", async () => {
    expect(
      (await bulk(gendered, { count: 10, capacity: 5, firstNumber: 101, gender: "FEMALE" })).status,
    ).toBe(204)
    const result = await rooms(gendered)
    expect(result.rooms.map((room) => room.name)).toEqual(
      Array.from({ length: 10 }, (_, index) => String(101 + index)),
    )
    expect(result.rooms.every((room) => room.capacity === 5 && room.gender === "FEMALE")).toBe(true)
    expect(result.capacity).toEqual({ FEMALE: 50, MALE: 0, total: 50 })
  })

  it("creates shared rooms without a gender", async () => {
    expect((await bulk(shared, { count: 3, capacity: 6, firstNumber: 1 })).status).toBe(204)
    const result = await rooms(shared)
    expect(result.rooms.map(({ name, gender }) => ({ name, gender }))).toEqual([
      { name: "1", gender: null },
      { name: "2", gender: null },
      { name: "3", gender: null },
    ])
    expect(result.capacity.total).toBe(18)
  })

  it("refuses numbers already used in the term and creates nothing", async () => {
    const response = await bulk(gendered, {
      count: 4,
      capacity: 2,
      firstNumber: 109,
      gender: "MALE",
    })
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      code: "ROOM_BULK_NAMES_TAKEN",
      params: { names: "109, 110" },
    })
    expect((await rooms(gendered)).rooms).toHaveLength(10)
  })

  it("lets the created rooms be edited one by one as in US-14", async () => {
    const [first] = (await rooms(gendered)).rooms
    expect(
      (
        await call(gendered, `/rooms/${first.id}`, "PUT", {
          name: "101A",
          capacity: 7,
          gender: "FEMALE",
        })
      ).status,
    ).toBe(204)
    expect((await call(gendered, `/rooms/${first.id}`, "DELETE")).status).toBe(204)
    const result = await rooms(gendered)
    expect(result.rooms).toHaveLength(9)
    expect(result.capacity.total).toBe(45)
  })
})
