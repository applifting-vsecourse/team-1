import { PrismaService } from "@/core/prisma/prisma.service"
import { EventRooms } from "@/modules/events/domain/rooms"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

describe("event rooms (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let participantCookie: string
  let eventId: string
  let foreignId: string
  let roomId: string
  const request = (
    path = "",
    method = "GET",
    body?: unknown,
    session = cookie,
  ): Promise<Response> =>
    fetch(api(`/organizer/events/${eventId}${path}`), {
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
    const foreign = await prisma.event.findFirstOrThrow({
      where: { organizationId: { not: member.organizationId } },
      include: { rooms: true },
    })
    foreignId = foreign.rooms[0].id
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
    let body = (await (await request("/rooms")).json()) as EventRooms
    expect(body.capacity).toEqual({ FEMALE: 1, MALE: 100, total: 101 })
    roomId = body.rooms[0].id
    expect(
      (await request(`/rooms/${roomId}`, "PUT", { name: "Updated", capacity: 21, gender: "MALE" }))
        .status,
    ).toBe(204)
    body = (await (await request("/rooms")).json()) as EventRooms
    expect(body.capacity).toEqual({ FEMALE: 0, MALE: 121, total: 121 })
    expect((await request(`/rooms/${roomId}`, "DELETE")).status).toBe(204)
    expect((await request(`/rooms/${roomId}`, "DELETE")).status).toBe(403)
  })

  it("converts to shared rooms and requires removing them before returning to gendered mode", async () => {
    expect((await request("/room-mode", "PATCH", { roomMode: "SHARED" })).status).toBe(204)
    let body = (await (await request("/rooms")).json()) as EventRooms
    expect(body.roomMode).toBe("SHARED")
    expect(body.capacity.total).toBe(100)
    expect(body.rooms[0].gender).toBeNull()
    expect((await request("/rooms", "POST", { name: "Shared", capacity: 2 })).status).toBe(204)
    expect(
      (await request("/rooms", "POST", { name: "Wrong gender", capacity: 2, gender: "MALE" }))
        .status,
    ).toBe(400)
    expect((await request("/room-mode", "PATCH", { roomMode: "GENDERED" })).status).toBe(409)
    body = (await (await request("/rooms")).json()) as EventRooms
    for (const room of body.rooms)
      expect((await request(`/rooms/${room.id}`, "DELETE")).status).toBe(204)
    expect((await request("/room-mode", "PATCH", { roomMode: "GENDERED" })).status).toBe(204)
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
    const term = await prisma.term.create({
      data: {
        organizationId: event.organizationId,
        eventId,
        name: "Shared term",
        startsOn: new Date("2027-07-01"),
        endsOn: new Date("2027-07-07"),
        priceCzk: 1000,
      },
    })
    const rooms = await prisma.room.findMany({ where: { eventId } })
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
    const sharedRoom = await prisma.room.findFirstOrThrow({ where: { eventId } })
    await request(`/rooms/${sharedRoom.id}`, "PUT", { name: "Shared", capacity: 1 })
    expect(
      await prisma.applicationTerm.count({ where: { termId: term.id, status: "CONFIRMED" } }),
    ).toBe(2)
  })
})
