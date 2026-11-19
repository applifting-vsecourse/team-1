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
    const body = { countFemale: 2, countMale: 1, capacity: 4, firstNumber: 1 }
    expect((await bulk(gendered, body, "")).status).toBe(401)
    expect((await bulk(gendered, body, participantCookie)).status).toBe(403)
    const otherCookie = await signIn("organizator2@example.com", "password2")
    expect((await bulk(gendered, body, otherCookie)).status).toBe(403)
    expect((await bulk(foreignTerm, body)).status).toBe(403)
    expect((await rooms(gendered)).rooms).toEqual([])
  })

  it("rejects invalid input and counts that do not fit the room mode", async () => {
    const valid = { countFemale: 2, countMale: 1, capacity: 4, firstNumber: 1 }
    for (const patch of [
      { countFemale: 0, countMale: 0 },
      { countFemale: 150, countMale: 51 },
      { countFemale: 200, countMale: 200 },
      { countFemale: 200, countMale: 1 },
      { countFemale: 201 },
      { countFemale: -1 },
      { countMale: 1.5 },
      { count: 2 },
      { capacity: 0 },
      { firstNumber: 0 },
      { firstNumber: 1_000_000 },
      { gender: "FEMALE" },
      { extra: true },
    ]) {
      expect((await bulk(gendered, { ...valid, ...patch })).status).toBe(400)
    }
    for (const body of [
      valid,
      { capacity: 4, firstNumber: 1 },
      { count: 0, capacity: 4, firstNumber: 1 },
      { count: 201, capacity: 4, firstNumber: 1 },
    ]) {
      expect((await bulk(shared, body)).status).toBe(400)
    }
    expect((await rooms(gendered)).rooms).toEqual([])
    expect((await rooms(shared)).rooms).toEqual([])
  })

  it("creates gendered rooms numbered across genders and recalculates the capacity", async () => {
    const response = await bulk(gendered, {
      countFemale: 6,
      countMale: 4,
      capacity: 5,
      firstNumber: 101,
    })
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      created: Array.from({ length: 10 }, (_, index) => String(101 + index)),
      skipped: [],
    })
    const result = await rooms(gendered)
    expect(result.rooms.map(({ name, gender }) => `${name}:${gender}`)).toEqual([
      ...[101, 102, 103, 104, 105, 106].map((number) => `${number}:FEMALE`),
      ...[107, 108, 109, 110].map((number) => `${number}:MALE`),
    ])
    expect(result.rooms.every((room) => room.capacity === 5)).toBe(true)
    expect(result.capacity).toEqual({ FEMALE: 30, MALE: 20, total: 50 })
  })

  it("creates shared rooms without a gender", async () => {
    const response = await bulk(shared, { count: 3, capacity: 6, firstNumber: 1 })
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ created: ["1", "2", "3"], skipped: [] })
    const result = await rooms(shared)
    expect(result.rooms.map(({ name, gender }) => ({ name, gender }))).toEqual([
      { name: "1", gender: null },
      { name: "2", gender: null },
      { name: "3", gender: null },
    ])
    expect(result.capacity.total).toBe(18)
  })

  it("skips the numbers the term already uses and creates the rest", async () => {
    const response = await bulk(gendered, {
      countFemale: 1,
      countMale: 3,
      capacity: 2,
      firstNumber: 109,
    })
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ created: ["111", "112"], skipped: ["109", "110"] })
    const result = await rooms(gendered)
    expect(result.rooms).toHaveLength(12)
    // The skipped numbers keep their original rooms and gender.
    expect(result.rooms.find((room) => room.name === "109")?.gender).toBe("MALE")
    expect(result.rooms.filter((room) => room.name === "111" || room.name === "112")).toEqual([
      expect.objectContaining({ gender: "MALE", capacity: 2 }),
      expect.objectContaining({ gender: "MALE", capacity: 2 }),
    ])
  })

  it("accepts the full cap of 200 rooms in one request", async () => {
    const response = await bulk(shared, { count: 200, capacity: 1, firstNumber: 1000 })
    expect(response.status).toBe(201)
    const { created } = (await response.json()) as { created: string[] }
    expect(created).toHaveLength(200)
    await prisma.room.deleteMany({ where: { termId: shared, name: { in: created } } })
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
    expect(result.rooms).toHaveLength(11)
    expect(result.capacity.total).toBe(49)
  })
})
