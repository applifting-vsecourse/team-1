import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type Status = "CONFIRMED" | "TO_EVALUATE" | "WAITLISTED"
type Listing = {
  rooms: { id: string; name: string; participants: { applicationTermId: string }[] }[]
  unassigned: {
    applicationTermId: string
    lastName: string
    alsoInTerms: { termId: string; rooms: { name: string; freeBeds: number }[] }[]
  }[]
}

describe("room assignments (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let participantCookie: string
  let foreignCookie: string
  let organizationId: string
  let eventId: string
  let term1: string
  let term2: string
  let term3: string
  const rooms: Record<string, string> = {}
  let counter = 0

  const base = (term = term1): string =>
    `/organizer/events/${eventId}/terms/${term}/room-assignments`
  const call = (
    path: string,
    method = "GET",
    body?: unknown,
    session = cookie,
  ): Promise<Response> =>
    fetch(api(path), {
      method,
      headers: { Cookie: session, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  const assign = (
    applicationTermId: string,
    roomId: string,
    alsoTermIds?: string[],
    term = term1,
  ): Promise<Response> => call(`${base(term)}/${applicationTermId}`, "PUT", { roomId, alsoTermIds })
  const list = async (term = term1): Promise<Listing> =>
    (await call(base(term))).json() as Promise<Listing>
  const roomOf = async (applicationTermId: string): Promise<string | undefined> =>
    (await prisma.roomAssignment.findUnique({ where: { applicationTermId } }))?.roomId

  /** An application with one row per term; returns the ids of those rows by term. */
  const makeApplication = async (
    lastName: string,
    terms: { termId: string; status: Status }[],
  ): Promise<{ applicationId: string; rows: Record<string, string> }> => {
    counter += 1
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId,
        accessToken: randomUUID(),
        firstName: "Test",
        lastName,
        birthDate: new Date("2010-01-01"),
        gender: "FEMALE",
        email: `us35-${counter}@example.com`,
        consentAt: new Date(),
        terms: {
          create: terms.map(({ termId, status }) => ({
            organizationId,
            termId,
            status,
            priceCzk: 1000,
          })),
        },
      },
      include: { terms: true },
    })
    return {
      applicationId: application.id,
      rows: Object.fromEntries(application.terms.map((row) => [row.termId, row.id])),
    }
  }
  const makeRoom = async (termId: string, name: string, capacity: number): Promise<string> =>
    (
      await prisma.room.create({
        data: { organizationId, termId, name, capacity, gender: "FEMALE" },
      })
    ).id

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
      data: { organizationId, name: "US-35", publicToken: `us35-${randomUUID()}` },
    })
    eventId = event.id
    const makeTerm = async (number: number, startsOn: string): Promise<string> =>
      (
        await prisma.term.create({
          data: {
            organizationId,
            eventId,
            number,
            name: `T${number}`,
            startsOn: new Date(startsOn),
            endsOn: new Date(startsOn),
            priceCzk: 1000,
          },
        })
      ).id
    term1 = await makeTerm(1, "2027-07-01")
    term2 = await makeTerm(2, "2027-07-08")
    term3 = await makeTerm(3, "2027-07-15")
    rooms.a1 = await makeRoom(term1, "Pokoj A", 2)
    rooms.b1 = await makeRoom(term1, "Pokoj B", 3)
    rooms.a2 = await makeRoom(term2, "Pokoj A", 2)
    rooms.only1 = await makeRoom(term1, "Jen první", 2)
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("protects every endpoint by session, role and organization", async () => {
    const { rows } = await makeApplication("Auth", [{ termId: term1, status: "CONFIRMED" }])
    const id = rows[term1]
    for (const session of ["", participantCookie]) {
      expect((await call(base(), "GET", undefined, session)).status).toBe(session ? 403 : 401)
    }
    expect((await call(base(), "GET", undefined, foreignCookie)).status).toBe(403)
    expect((await assign(id, rooms.a1, undefined, term1)).status).toBe(204)
    const response = await call(`${base()}/${id}`, "PUT", { roomId: rooms.a1 }, foreignCookie)
    expect(response.status).toBe(403)
    expect((await call(`${base()}/${id}`, "DELETE", undefined, foreignCookie)).status).toBe(403)
    expect((await call(`${base()}/${id}`, "DELETE")).status).toBe(204)
  })

  it("lists confirmed and to-evaluate applications as unassigned, not the waitlisted ones", async () => {
    const confirmed = await makeApplication("Potvrzena", [{ termId: term1, status: "CONFIRMED" }])
    const toEvaluate = await makeApplication("Vyhodnoceni", [
      { termId: term1, status: "TO_EVALUATE" },
    ])
    const waitlisted = await makeApplication("Nahradnik", [{ termId: term1, status: "WAITLISTED" }])
    const { unassigned } = await list()
    const ids = unassigned.map((row) => row.applicationTermId)
    expect(ids).toContain(confirmed.rows[term1])
    expect(ids).toContain(toEvaluate.rows[term1])
    expect(ids).not.toContain(waitlisted.rows[term1])
    const response = await assign(waitlisted.rows[term1], rooms.b1)
    expect(response.status).toBe(409)
    expect(((await response.json()) as { code: string }).code).toBe(
      "ROOM_ASSIGNMENT_STATUS_INVALID",
    )
  })

  it("assigns, moves and unassigns, and never overfills a room", async () => {
    const [x, y, z] = await Promise.all(
      ["X", "Y", "Z"].map((name) =>
        makeApplication(`Lůžko ${name}`, [{ termId: term1, status: "CONFIRMED" }]),
      ),
    )
    expect((await assign(x.rows[term1], rooms.a1)).status).toBe(204)
    expect((await assign(y.rows[term1], rooms.a1)).status).toBe(204)
    const full = await assign(z.rows[term1], rooms.a1)
    expect(full.status).toBe(409)
    expect(((await full.json()) as { code: string }).code).toBe("ROOM_FULL")
    // staying in the full room they already are in is fine
    expect((await assign(x.rows[term1], rooms.a1)).status).toBe(204)
    // an extra bed (US-80) is a bed
    await prisma.room.update({ where: { id: rooms.a1 }, data: { extraBeds: 1 } })
    expect((await assign(z.rows[term1], rooms.a1)).status).toBe(204)
    await prisma.room.update({ where: { id: rooms.a1 }, data: { extraBeds: 0 } })

    // move
    expect((await assign(z.rows[term1], rooms.b1)).status).toBe(204)
    expect(await roomOf(z.rows[term1])).toBe(rooms.b1)
    const moved = await list()
    expect(moved.rooms.find((room) => room.id === rooms.a1)?.participants).toHaveLength(2)
    // unassign: back among the unassigned
    expect((await call(`${base()}/${z.rows[term1]}`, "DELETE")).status).toBe(204)
    expect(await roomOf(z.rows[term1])).toBeUndefined()
    expect((await list()).unassigned.map((row) => row.applicationTermId)).toContain(z.rows[term1])
    for (const row of [x, y]) await call(`${base()}/${row.rows[term1]}`, "DELETE")
  })

  it("rejects a room of another term and an application of another term", async () => {
    const { rows } = await makeApplication("Cizí pokoj", [{ termId: term1, status: "CONFIRMED" }])
    const wrongRoom = await assign(rows[term1], rooms.a2)
    expect(wrongRoom.status).toBe(409)
    expect(((await wrongRoom.json()) as { code: string }).code).toBe("ROOM_NOT_IN_TERM")
    expect((await assign(rows[term1], rooms.a2, undefined, term2)).status).toBe(403)
  })

  it("assigns to the same-named room of the other term in one step (AC3)", async () => {
    const { rows } = await makeApplication("Dva termíny", [
      { termId: term1, status: "CONFIRMED" },
      { termId: term2, status: "TO_EVALUATE" },
    ])
    const entry = (await list()).unassigned.find((row) => row.applicationTermId === rows[term1])
    expect(entry?.alsoInTerms.map((other) => other.termId)).toEqual([term2])
    expect(entry?.alsoInTerms[0].rooms.map((room) => room.name)).toContain("Pokoj A")

    expect((await assign(rows[term1], rooms.a1, [term2])).status).toBe(204)
    expect(await roomOf(rows[term1])).toBe(rooms.a1)
    expect(await roomOf(rows[term2])).toBe(rooms.a2)
    for (const [term, id] of Object.entries(rows)) await call(`${base(term)}/${id}`, "DELETE")
  })

  it("places nobody when the other term cannot take them (AC3 all or nothing)", async () => {
    const full = await makeApplication("Obsazeno", [{ termId: term2, status: "CONFIRMED" }])
    const filler = await makeApplication("Druhé lůžko", [{ termId: term2, status: "CONFIRMED" }])
    await prisma.roomAssignment.createMany({
      data: [full, filler].map(({ rows }) => ({
        organizationId,
        applicationTermId: rows[term2],
        roomId: rooms.a2,
      })),
    })
    const { rows } = await makeApplication("Vrácení", [
      { termId: term1, status: "CONFIRMED" },
      { termId: term2, status: "CONFIRMED" },
    ])
    const rejected = await assign(rows[term1], rooms.a1, [term2])
    expect(rejected.status).toBe(409)
    expect(((await rejected.json()) as { code: string }).code).toBe("ROOM_FULL")
    expect(await roomOf(rows[term1])).toBeUndefined()

    const missing = await assign(rows[term1], rooms.only1, [term2])
    expect(missing.status).toBe(409)
    expect(((await missing.json()) as { code: string }).code).toBe(
      "ROOM_ASSIGNMENT_NO_MATCHING_ROOM",
    )
    expect(await roomOf(rows[term1])).toBeUndefined()
    await prisma.roomAssignment.deleteMany({ where: { roomId: rooms.a2 } })
  })

  it("lets only one of two simultaneous requests take the last bed", async () => {
    const lastRoom = await makeRoom(term1, "Poslední lůžko", 1)
    const [p, q] = await Promise.all(
      ["P", "Q"].map((name) =>
        makeApplication(`Souběh ${name}`, [{ termId: term1, status: "CONFIRMED" }]),
      ),
    )
    const results = await Promise.all([
      assign(p.rows[term1], lastRoom),
      assign(q.rows[term1], lastRoom),
    ])
    expect(results.map((response) => response.status).sort()).toEqual([204, 409])
    expect(await prisma.roomAssignment.count({ where: { roomId: lastRoom } })).toBe(1)
  })

  describe("releases the bed when the application leaves confirmed / to evaluate", () => {
    it("on a status change", async () => {
      const waitlisted = await makeApplication("Do náhradníků", [
        { termId: term1, status: "TO_EVALUATE" },
      ])
      const cancelled = await makeApplication("Zrušená", [{ termId: term1, status: "CONFIRMED" }])
      await assign(waitlisted.rows[term1], rooms.b1)
      await assign(cancelled.rows[term1], rooms.b1)
      const patch = (applicationId: string, status: string): Promise<Response> =>
        call(`/organizer/applications/${applicationId}/terms/${term1}/status`, "PATCH", { status })
      expect((await patch(waitlisted.applicationId, "WAITLISTED")).status).toBe(204)
      expect((await patch(cancelled.applicationId, "CANCELLED")).status).toBe(204)
      expect(await roomOf(waitlisted.rows[term1])).toBeUndefined()
      expect(await roomOf(cancelled.rows[term1])).toBeUndefined()
    })

    it("when the organizer moves the application to another term", async () => {
      const { applicationId, rows } = await makeApplication("Změna termínu", [
        { termId: term1, status: "CONFIRMED" },
        { termId: term2, status: "CONFIRMED" },
      ])
      await assign(rows[term1], rooms.b1)
      await assign(rows[term2], rooms.a2, undefined, term2)
      const response = await call(`/organizer/applications/${applicationId}/terms`, "PUT", {
        termIds: [term2],
      })
      expect(response.status).toBe(200)
      expect(await roomOf(rows[term1])).toBeUndefined()
      expect(await roomOf(rows[term2])).toBe(rooms.a2)
      await call(`${base(term2)}/${rows[term2]}`, "DELETE", undefined)
    })

    it("when the term is cancelled", async () => {
      const room = await makeRoom(term3, "Pokoj A", 2)
      const { rows } = await makeApplication("Zrušený termín", [
        { termId: term3, status: "CONFIRMED" },
      ])
      expect((await assign(rows[term3], room, undefined, term3)).status).toBe(204)
      const cancel = await call(`/organizer/events/${eventId}/terms/${term3}/cancel`, "POST", {
        reason: "Test",
      })
      expect(cancel.status).toBe(201)
      expect(await roomOf(rows[term3])).toBeUndefined()
      expect((await assign(rows[term3], room, undefined, term3)).status).toBe(409)
    })
  })
})
