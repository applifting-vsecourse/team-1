import { PrismaService } from "@/core/prisma/prisma.service"
import { TermRooms } from "@/modules/events/domain/rooms"
import {
  api,
  connectTestPrisma,
  nextTermNumber,
  resetAndSeed,
  signIn,
} from "@/test/integration/test-api"

describe("copying rooms between terms (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let participantCookie: string
  let eventId: string
  let organizationId: string
  let source: string
  let target: string
  let shared: string
  let foreignTerm: string
  const call = (termId: string, path: string, method = "GET", body?: unknown, session = cookie) =>
    fetch(api(`/organizer/events/${eventId}/terms/${termId}${path}`), {
      method,
      headers: { Cookie: session, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  const copy = (
    to: string,
    sourceTermId: string,
    strategy: "ADD" | "REPLACE",
    session = cookie,
  ): Promise<Response> => call(to, "/rooms/copy", "POST", { sourceTermId, strategy }, session)
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
    const event = await prisma.event.create({
      data: { organizationId, name: "Copy test", publicToken: "rooms-copy-integration-test" },
    })
    eventId = event.id
    const makeTerm = async (
      name: string,
      day: number,
      roomMode: "GENDERED" | "SHARED" = "GENDERED",
    ) =>
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
    source = await makeTerm("Source", 1)
    target = await makeTerm("Target", 8)
    shared = await makeTerm("Shared", 15, "SHARED")
    await prisma.room.createMany({
      data: [
        { organizationId, termId: source, name: "A", capacity: 4, gender: "FEMALE" },
        { organizationId, termId: source, name: "B", capacity: 6, gender: "MALE" },
      ],
    })
    foreignTerm = (
      await prisma.term.findFirstOrThrow({ where: { organizationId: { not: organizationId } } })
    ).id
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("protects the copy by session, role and organization", async () => {
    expect((await copy(target, source, "ADD", "")).status).toBe(401)
    expect((await copy(target, source, "ADD", participantCookie)).status).toBe(403)
    const otherCookie = await signIn("organizator2@example.com", "password2")
    expect((await copy(target, source, "ADD", otherCookie)).status).toBe(403)
    // A term of another organization is no source.
    expect((await copy(target, foreignTerm, "ADD")).status).toBe(403)
    expect((await rooms(target)).rooms).toEqual([])
  })

  it("rejects invalid bodies, the same term, a term without rooms and another room mode", async () => {
    expect((await call(target, "/rooms/copy", "POST", { sourceTermId: source })).status).toBe(400)
    expect(
      (await call(target, "/rooms/copy", "POST", { sourceTermId: source, strategy: "MERGE" }))
        .status,
    ).toBe(400)
    expect((await copy(source, source, "ADD")).status).toBe(400)
    expect((await copy(source, target, "ADD")).status).toBe(400)
    expect((await copy(shared, source, "ADD")).status).toBe(400)
    expect((await copy(target, shared, "ADD")).status).toBe(400)
  })

  it("copies name, capacity and gender into an empty term and recalculates its capacity", async () => {
    expect((await copy(target, source, "ADD")).status).toBe(204)
    const copied = await rooms(target)
    expect(copied.rooms.map(({ name, capacity, gender }) => ({ name, capacity, gender }))).toEqual([
      { name: "A", capacity: 4, gender: "FEMALE" },
      { name: "B", capacity: 6, gender: "MALE" },
    ])
    expect(copied.capacity).toEqual({ FEMALE: 4, MALE: 6, total: 10 })
  })

  it("leaves the copies independent of the source", async () => {
    const [first] = (await rooms(target)).rooms
    expect(
      (
        await call(target, `/rooms/${first.id}`, "PUT", {
          name: "A2",
          capacity: 9,
          gender: "FEMALE",
        })
      ).status,
    ).toBe(204)
    const original = await rooms(source)
    expect(original.rooms.map((room) => room.name)).toEqual(["A", "B"])
    expect(original.capacity).toEqual({ FEMALE: 4, MALE: 6, total: 10 })
    expect(first.id).not.toBe(original.rooms[0].id)
  })

  it("refuses to add a room whose name the term already uses and changes nothing", async () => {
    // The target keeps "B" from the first copy, so adding the source again collides.
    const response = await copy(target, source, "ADD")
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      code: "ROOM_COPY_NAMES_TAKEN",
      params: { names: "B" },
    })
    expect((await rooms(target)).rooms.map((room) => room.name)).toEqual(["A2", "B"])
  })

  it("adds the copies to the rooms the term already has", async () => {
    const existing = await rooms(target)
    await call(target, `/rooms/${existing.rooms[1].id}`, "DELETE")
    await call(target, `/rooms/${existing.rooms[0].id}`, "PUT", {
      name: "Own",
      capacity: 2,
      gender: "MALE",
    })
    const added = await rooms(target)
    expect(added.rooms.map((room) => room.name)).toEqual(["Own"])
    expect((await copy(target, source, "ADD")).status).toBe(204)
    const after = await rooms(target)
    expect(after.rooms.map((room) => room.name).sort()).toEqual(["A", "B", "Own"])
    expect(after.capacity).toEqual({ FEMALE: 4, MALE: 8, total: 12 })
  })

  it("replaces the rooms the term already has", async () => {
    expect((await copy(target, source, "REPLACE")).status).toBe(204)
    const replaced = await rooms(target)
    expect(replaced.rooms.map((room) => room.name)).toEqual(["A", "B"])
    expect(replaced.capacity).toEqual({ FEMALE: 4, MALE: 6, total: 10 })
  })

  it("copies shared rooms between shared terms", async () => {
    const other = await prisma.term.create({
      data: {
        organizationId,
        eventId,
        number: await nextTermNumber(prisma, eventId),
        name: "Shared 2",
        roomMode: "SHARED",
        startsOn: new Date("2027-07-01"),
        endsOn: new Date("2027-07-06"),
        priceCzk: 1000,
      },
    })
    await prisma.room.create({ data: { organizationId, termId: shared, name: "S", capacity: 3 } })
    expect((await copy(other.id, shared, "ADD")).status).toBe(204)
    const copied = await rooms(other.id)
    expect(copied.rooms.map(({ name, gender }) => ({ name, gender }))).toEqual([
      { name: "S", gender: null },
    ])
    expect(copied.capacity.total).toBe(3)
  })
})
