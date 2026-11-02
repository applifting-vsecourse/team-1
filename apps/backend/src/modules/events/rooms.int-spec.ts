import { PrismaService } from "@/core/prisma/prisma.service"
import { TermRooms } from "@/modules/events/domain/rooms"
import {
  api,
  connectTestPrisma,
  nextTermNumber,
  resetAndSeed,
  signIn,
} from "@/test/integration/test-api"

describe("term rooms (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let participantCookie: string
  let eventId: string
  let termId: string
  let otherTermId: string
  let foreignId: string
  let roomId: string
  const request = (
    path = "",
    method = "GET",
    body?: unknown,
    session = cookie,
  ): Promise<Response> =>
    fetch(api(`/organizer/events/${eventId}/terms/${termId}${path}`), {
      method,
      headers: { Cookie: session, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    participantCookie = await signIn("ucastnik@example.com", "password4")
    const member = await prisma.organizationMember.findFirstOrThrow({
      where: { user: { email: "organizator@example.com" } },
    })
    const event = await prisma.event.create({
      data: {
        organizationId: member.organizationId,
        name: "Room test",
        publicToken: "rooms-integration-test",
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
    termId = (await makeTerm("Room term", "2027-06-01", "2027-06-07")).id
    otherTermId = (await makeTerm("Other term", "2027-06-08", "2027-06-14")).id
    const foreign = await prisma.room.findFirstOrThrow({
      where: { organizationId: { not: member.organizationId } },
    })
    foreignId = foreign.id
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("protects reads and writes by session, role and organization", async () => {
    expect((await request("/rooms", "GET", undefined, "")).status).toBe(401)
    expect((await request("/rooms", "GET", undefined, participantCookie)).status).toBe(403)
    const otherCookie = await signIn("organizator2@example.com", "password2")
    for (const [path, method, body] of [
      ["/rooms", "GET", undefined],
      ["/rooms", "POST", { name: "Foreign", capacity: 2, gender: "FEMALE" }],
      ["/room-mode", "PATCH", { roomMode: "SHARED" }],
    ] as const)
      expect((await request(path, method, body, otherCookie)).status).toBe(403)
    expect(
      (
        await request(`/rooms/${foreignId}`, "PUT", {
          name: "Foreign",
          capacity: 2,
          gender: "FEMALE",
        })
      ).status,
    ).toBe(403)
    expect((await request(`/rooms/${foreignId}`, "DELETE")).status).toBe(403)
    expect(await prisma.room.findUnique({ where: { id: foreignId } })).not.toBeNull()
  })

  it.each([0, -1, 1.5, "5", null, 2147483648])("rejects invalid capacity %s", async (capacity) => {
    expect(
      (await request("/rooms", "POST", { name: "Invalid", capacity, gender: "FEMALE" })).status,
    ).toBe(400)
  })

  it("requires name and gender in gendered mode and rejects extra fields", async () => {
    for (const body of [
      { name: "  ", capacity: 5, gender: "FEMALE" },
      { name: "12", capacity: 5 },
      { name: "12", capacity: 5, gender: "OTHER" },
      { name: "12", capacity: 5, gender: "FEMALE", organizationId: "foreign" },
    ]) {
      expect((await request("/rooms", "POST", body)).status).toBe(400)
    }
  })

  it("creates, edits and deletes rooms with live capacity and unique names", async () => {
    expect(
      (await request("/rooms", "POST", { name: " 12 ", capacity: 1, gender: "FEMALE" })).status,
    ).toBe(204)
    expect(
      (await request("/rooms", "POST", { name: "13", capacity: 100, gender: "MALE" })).status,
    ).toBe(204)
    expect(
      (await request("/rooms", "POST", { name: "12", capacity: 5, gender: "FEMALE" })).status,
    ).toBe(409)
    let body = (await (await request("/rooms")).json()) as TermRooms
    expect(body.capacity).toEqual({ FEMALE: 1, MALE: 100, total: 101 })
    roomId = body.rooms[0].id
    expect(
      (await request(`/rooms/${roomId}`, "PUT", { name: "Updated", capacity: 21, gender: "MALE" }))
        .status,
    ).toBe(204)
    body = (await (await request("/rooms")).json()) as TermRooms
    expect(body.capacity).toEqual({ FEMALE: 0, MALE: 121, total: 121 })
    expect((await request(`/rooms/${roomId}`, "DELETE")).status).toBe(204)
    expect((await request(`/rooms/${roomId}`, "DELETE")).status).toBe(403)
  })

  it("converts to shared rooms and back with a gender for every room", async () => {
    expect((await request("/room-mode", "PATCH", { roomMode: "SHARED" })).status).toBe(204)
    let body = (await (await request("/rooms")).json()) as TermRooms
    expect(body.roomMode).toBe("SHARED")
    expect(body.capacity.total).toBe(100)
    expect(body.rooms[0].gender).toBeNull()
    expect((await request("/rooms", "POST", { name: "Shared", capacity: 2 })).status).toBe(204)
    expect(
      (await request("/rooms", "POST", { name: "Wrong gender", capacity: 2, gender: "MALE" }))
        .status,
    ).toBe(400)
    body = (await (await request("/rooms")).json()) as TermRooms
    const [first, ...rest] = body.rooms
    // Every existing room needs a gender before the term can go back to gendered rooms.
    expect(
      (
        await request("/room-mode", "PATCH", {
          roomMode: "GENDERED",
          rooms: [{ id: first.id, gender: "FEMALE" }],
        })
      ).status,
    ).toBe(400)
    expect((await request("/room-mode", "PATCH", { roomMode: "GENDERED" })).status).toBe(400)
    expect(
      (
        await request("/room-mode", "PATCH", {
          roomMode: "GENDERED",
          rooms: [first, ...rest].map((room, index) => ({
            id: room.id,
            gender: index === 0 ? "FEMALE" : "MALE",
          })),
        })
      ).status,
    ).toBe(204)
    body = (await (await request("/rooms")).json()) as TermRooms
    expect(body.roomMode).toBe("GENDERED")
    expect(body.rooms.every((room) => room.gender !== null)).toBe(true)
    expect(body.capacity.FEMALE + body.capacity.MALE).toBe(102)
  })

  it("keeps rooms and room mode of one term apart from another term of the event", async () => {
    const other = (path = "", method = "GET", body?: unknown) =>
      fetch(api(`/organizer/events/${eventId}/terms/${otherTermId}${path}`), {
        method,
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    expect((await other("/room-mode", "PATCH", { roomMode: "SHARED" })).status).toBe(204)
    expect((await other("/rooms", "POST", { name: "Common", capacity: 7 })).status).toBe(204)
    // The same name is free in another term.
    expect(
      (await request("/rooms", "POST", { name: "Common", capacity: 3, gender: "FEMALE" })).status,
    ).toBe(204)
    const mine = (await (await request("/rooms")).json()) as TermRooms
    const theirs = (await (await other("/rooms")).json()) as TermRooms
    expect(mine.roomMode).toBe("GENDERED")
    expect(theirs.roomMode).toBe("SHARED")
    expect(theirs.rooms.map((room) => room.name)).toEqual(["Common"])
    expect(theirs.capacity.total).toBe(7)
    // A room id of one term is a foreign record in another.
    const [mineRoom] = mine.rooms
    expect((await other(`/rooms/${mineRoom.id}`, "DELETE")).status).toBe(403)
    await request(`/rooms/${mine.rooms[mine.rooms.length - 1].id}`, "DELETE")
  })

  it("serializes duplicate-name creation", async () => {
    const responses = await Promise.all(
      Array.from({ length: 2 }, () =>
        request("/rooms", "POST", { name: "Same", capacity: 5, gender: "FEMALE" }),
      ),
    )
    expect(responses.map((r) => r.status).sort()).toEqual([204, 409])
  })

  it("shares beds across genders under concurrent public submissions", async () => {
    const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } })
    const term = await prisma.term.findUniqueOrThrow({ where: { id: termId } })
    const rooms = await prisma.room.findMany({ where: { termId } })
    for (const room of rooms) await request(`/rooms/${room.id}`, "DELETE")
    await request("/room-mode", "PATCH", { roomMode: "SHARED" })
    await request("/rooms", "POST", { name: "Shared", capacity: 2 })
    const responses = await Promise.all(
      ["FEMALE", "MALE", "FEMALE", "MALE"].map((gender, index) =>
        fetch(api(`/public/events/${event.publicToken}/applications`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: `shared-room-${index}@example.com`,
            consent: true,
            participants: [
              {
                firstName: "Test",
                lastName: `Shared${index}`,
                birthDate: "2014-05-18",
                gender,
                termIds: [term.id],
              },
            ],
          }),
        }),
      ),
    )
    expect(responses.every((response) => response.status === 201)).toBe(true)
    expect(
      await prisma.applicationTerm.count({ where: { termId: term.id, status: "CONFIRMED" } }),
    ).toBe(2)
    expect(
      await prisma.applicationTerm.count({ where: { termId: term.id, status: "WAITLISTED" } }),
    ).toBe(2)
    const sharedRoom = await prisma.room.findFirstOrThrow({ where: { termId } })
    await request(`/rooms/${sharedRoom.id}`, "PUT", { name: "Shared", capacity: 1 })
    expect(
      await prisma.applicationTerm.count({ where: { termId: term.id, status: "CONFIRMED" } }),
    ).toBe(2)
  })
})
