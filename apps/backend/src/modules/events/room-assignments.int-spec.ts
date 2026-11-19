import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type Status = "CONFIRMED" | "TO_EVALUATE" | "WAITLISTED"
type Listing = {
  rooms: {
    id: string
    name: string
    participants: { applicationTermId: string; birthYear: number }[]
  }[]
  unassigned: {
    applicationTermId: string
    lastName: string
    birthYear: number
    alsoInTerms: { termId: string; rooms: { name: string; beds: number; freeBeds: number }[] }[]
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
    confirmExtraBed?: boolean,
  ): Promise<Response> =>
    call(`${base(term)}/${applicationTermId}`, "PUT", { roomId, alsoTermIds, confirmExtraBed })
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

  it("gives the birth year, never the full birth date, of assigned and unassigned people (US-36)", async () => {
    const assigned = await makeApplication("Rok přiřazený", [
      { termId: term1, status: "CONFIRMED" },
    ])
    const waiting = await makeApplication("Rok nepřiřazený", [
      { termId: term1, status: "CONFIRMED" },
    ])
    expect((await assign(assigned.rows[term1], rooms.b1)).status).toBe(204)
    const body = await list()
    const inRoom = body.rooms
      .flatMap((room) => room.participants)
      .find((person) => person.applicationTermId === assigned.rows[term1])
    const without = body.unassigned.find((row) => row.applicationTermId === waiting.rows[term1])
    expect(inRoom?.birthYear).toBe(2010)
    expect(without?.birthYear).toBe(2010)
    expect(JSON.stringify(body)).not.toContain("2010-01-01")
    await call(`${base()}/${assigned.rows[term1]}`, "DELETE")
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
    expect(entry?.alsoInTerms[0].rooms.find((room) => room.name === "Pokoj A")?.beds).toBe(2)

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

  describe("a full room takes one more person as a confirmed extra bed (US-37, D-112)", () => {
    const extraBedsOf = async (roomId: string): Promise<number> =>
      (await prisma.room.findUniqueOrThrow({ where: { id: roomId } })).extraBeds

    it("answers 409 without the confirmation and adds an extra bed with it", async () => {
      const room = await makeRoom(term1, "Přeplněný", 1)
      const [p, q] = await Promise.all(
        ["P", "Q"].map((name) =>
          makeApplication(`Přistýlka ${name}`, [{ termId: term1, status: "CONFIRMED" }]),
        ),
      )
      expect((await assign(p.rows[term1], room)).status).toBe(204)
      expect((await assign(q.rows[term1], room)).status).toBe(409)
      expect(await extraBedsOf(room)).toBe(0)

      expect((await assign(q.rows[term1], room, undefined, term1, true)).status).toBe(204)
      expect(await extraBedsOf(room)).toBe(1)
      expect(await roomOf(q.rows[term1])).toBe(room)
      // a room with a free bed gets no extra bed from the confirmation
      const free = await makeRoom(term1, "Volný", 2)
      const another = await makeApplication("Přesun", [{ termId: term1, status: "CONFIRMED" }])
      expect((await assign(another.rows[term1], free, undefined, term1, true)).status).toBe(204)
      expect(await extraBedsOf(free)).toBe(0)
      // moving into a full room works the same way
      expect((await assign(another.rows[term1], room, undefined, term1, true)).status).toBe(204)
      expect(await extraBedsOf(room)).toBe(2)
    })

    it("does not evaluate the term: a waitlisted person stays waitlisted (D-108)", async () => {
      const room = await makeRoom(term1, "Náhradník", 1)
      const waiting = await makeApplication("Náhradník", [{ termId: term1, status: "WAITLISTED" }])
      const [p, q] = await Promise.all(
        ["P", "Q"].map((name) =>
          makeApplication(`D108 ${name}`, [{ termId: term1, status: "CONFIRMED" }]),
        ),
      )
      expect((await assign(p.rows[term1], room)).status).toBe(204)
      expect((await assign(q.rows[term1], room, undefined, term1, true)).status).toBe(204)
      const row = await prisma.applicationTerm.findUniqueOrThrow({
        where: { id: waiting.rows[term1] },
      })
      expect(row.status).toBe("WAITLISTED")
    })

    it("adds an extra bed in every term of an all-or-nothing assignment (AC3)", async () => {
      const room1 = await makeRoom(term1, "Dvojí přeplnění", 1)
      const room2 = await makeRoom(term2, "Dvojí přeplnění", 1)
      const holders = await Promise.all([
        makeApplication("Drží 1", [{ termId: term1, status: "CONFIRMED" }]),
        makeApplication("Drží 2", [{ termId: term2, status: "CONFIRMED" }]),
      ])
      await prisma.roomAssignment.createMany({
        data: [
          { organizationId, applicationTermId: holders[0].rows[term1], roomId: room1 },
          { organizationId, applicationTermId: holders[1].rows[term2], roomId: room2 },
        ],
      })
      const { rows } = await makeApplication("Dva plné", [
        { termId: term1, status: "CONFIRMED" },
        { termId: term2, status: "CONFIRMED" },
      ])
      expect((await assign(rows[term1], room1, [term2], term1, true)).status).toBe(204)
      expect(await extraBedsOf(room1)).toBe(1)
      expect(await extraBedsOf(room2)).toBe(1)
      expect(await roomOf(rows[term2])).toBe(room2)

      // all or nothing: when the other term has no room of that name nothing changes, not even the extra bed
      const lone = await makeRoom(term1, "Jen v prvním", 1)
      const filler = await makeApplication("Plní", [{ termId: term1, status: "CONFIRMED" }])
      await prisma.roomAssignment.create({
        data: { organizationId, applicationTermId: filler.rows[term1], roomId: lone },
      })
      const other = await makeApplication("Vrácení", [
        { termId: term1, status: "CONFIRMED" },
        { termId: term2, status: "CONFIRMED" },
      ])
      const rejected = await assign(other.rows[term1], lone, [term2], term1, true)
      expect(rejected.status).toBe(409)
      expect(await extraBedsOf(lone)).toBe(0)
      expect(await roomOf(other.rows[term1])).toBeUndefined()
    })

    it("adds the extra bed only in the terms where the room is full, elsewhere it just assigns (#540)", async () => {
      const room1 = await makeRoom(term1, "Plný jen tady", 1)
      const room2 = await makeRoom(term2, "Plný jen tady", 2)
      const holder = await makeApplication("Drží jen první", [
        { termId: term1, status: "CONFIRMED" },
      ])
      await prisma.roomAssignment.create({
        data: { organizationId, applicationTermId: holder.rows[term1], roomId: room1 },
      })
      const { rows } = await makeApplication("Plný v jednom", [
        { termId: term1, status: "CONFIRMED" },
        { termId: term2, status: "TO_EVALUATE" },
      ])
      expect((await assign(rows[term1], room1, [term2], term1, true)).status).toBe(204)
      expect(await extraBedsOf(room1)).toBe(1)
      expect(await extraBedsOf(room2)).toBe(0)
      expect(await roomOf(rows[term1])).toBe(room1)
      expect(await roomOf(rows[term2])).toBe(room2)
    })

    it("leaves out a term that is not in alsoTermIds: no extra bed and no assignment there (#540)", async () => {
      const room1 = await makeRoom(term1, "Jeden termín vynechán", 1)
      const room2 = await makeRoom(term2, "Jeden termín vynechán", 1)
      const holders = await Promise.all([
        makeApplication("Vynechán 1", [{ termId: term1, status: "CONFIRMED" }]),
        makeApplication("Vynechán 2", [{ termId: term2, status: "CONFIRMED" }]),
      ])
      await prisma.roomAssignment.createMany({
        data: [
          { organizationId, applicationTermId: holders[0].rows[term1], roomId: room1 },
          { organizationId, applicationTermId: holders[1].rows[term2], roomId: room2 },
        ],
      })
      const { rows } = await makeApplication("Odškrtnutý termín", [
        { termId: term1, status: "CONFIRMED" },
        { termId: term2, status: "CONFIRMED" },
      ])
      expect((await assign(rows[term1], room1, [], term1, true)).status).toBe(204)
      expect(await extraBedsOf(room1)).toBe(1)
      expect(await extraBedsOf(room2)).toBe(0)
      expect(await roomOf(rows[term2])).toBeUndefined()
    })

    it("saves nothing when one term fails, not even the extra bed of this term (#540)", async () => {
      const room1 = await makeRoom(term1, "Chyba v druhém", 1)
      const room2 = await makeRoom(term2, "Chyba v druhém", 2)
      const holder = await makeApplication("Drží chybu", [{ termId: term1, status: "CONFIRMED" }])
      await prisma.roomAssignment.create({
        data: { organizationId, applicationTermId: holder.rows[term1], roomId: room1 },
      })
      // a waitlisted application cannot be placed in a room, so the second term rejects it
      const { rows } = await makeApplication("Náhradník v druhém", [
        { termId: term1, status: "CONFIRMED" },
        { termId: term2, status: "WAITLISTED" },
      ])
      const rejected = await assign(rows[term1], room1, [term2], term1, true)
      expect(rejected.status).toBe(409)
      expect(((await rejected.json()) as { code: string }).code).toBe(
        "ROOM_ASSIGNMENT_STATUS_INVALID",
      )
      expect(await extraBedsOf(room1)).toBe(0)
      expect(await extraBedsOf(room2)).toBe(0)
      expect(await roomOf(rows[term1])).toBeUndefined()
      expect(await roomOf(rows[term2])).toBeUndefined()
    })

    it("lists the warnings of the term for organizers (AC1, AC2, AC3)", async () => {
      const lonely = await prisma.term.create({
        data: {
          organizationId,
          eventId,
          number: 9,
          name: "T9",
          startsOn: new Date("2027-08-01"),
          endsOn: new Date("2027-08-01"),
          priceCzk: 1000,
        },
      })
      const t = lonely.id
      type Warned = {
        warnings: { kind: string; roomId: string | null; applicationTermId: string | null }[]
        summary: { violations: number; confirmedWithoutBed: number }
      }
      const warned = async (): Promise<Warned> => (await list(t)) as unknown as Warned
      const makeMale = async (name: string, status: Status) => {
        const application = await makeApplication(name, [{ termId: t, status }])
        await prisma.application.update({
          where: { id: application.applicationId },
          data: { gender: "MALE" },
        })
        return application.rows[t]
      }
      const women = await makeRoom(t, "Dámský", 2)
      const [m1, m2, m3] = await Promise.all(
        ["M1", "M2", "M3"].map((name) => makeMale(name, "CONFIRMED")),
      )
      const toEvaluate = await makeMale("K vyhodnocení", "TO_EVALUATE")

      // nobody assigned yet: no warnings at all
      expect((await warned()).warnings).toEqual([])
      // the first assignment: a man in a women's room, and two confirmed men without a bed
      expect((await assign(m1, women, undefined, t)).status).toBe(204)
      const afterFirst = await warned()
      expect(afterFirst.warnings.map((warning) => warning.kind).sort()).toEqual([
        "CONFIRMED_WITHOUT_BED",
        "CONFIRMED_WITHOUT_BED",
        "MIXED_GENDER",
      ])
      expect(afterFirst.summary).toMatchObject({ violations: 1, confirmedWithoutBed: 2 })
      expect(afterFirst.warnings.map((warning) => warning.applicationTermId)).not.toContain(
        toEvaluate,
      )
      // over capacity needs the confirmation, then the room is a bed bigger and nothing is overcrowded
      expect((await assign(m2, women, undefined, t)).status).toBe(204)
      expect((await assign(m3, women, undefined, t)).status).toBe(409)
      expect((await assign(m3, women, undefined, t, true)).status).toBe(204)
      const afterAll = await warned()
      expect(afterAll.warnings.map((warning) => warning.kind)).toEqual(["MIXED_GENDER"])
      // taking the extra bed away makes the room overcrowded (D-138)
      await prisma.room.update({ where: { id: women }, data: { extraBeds: 0 } })
      expect((await warned()).warnings.map((warning) => warning.kind).sort()).toEqual([
        "MIXED_GENDER",
        "OVERCROWDED",
      ])
      // a participant sees none of it
      expect((await call(base(t), "GET", undefined, participantCookie)).status).toBe(403)
    })

    it("does not count a person with a request for individual accommodation as mixed gender (US-38)", async () => {
      const term = await prisma.term.create({
        data: {
          organizationId,
          eventId,
          number: 11,
          name: "T11",
          startsOn: new Date("2027-09-01"),
          endsOn: new Date("2027-09-01"),
          priceCzk: 1000,
        },
      })
      const t = term.id
      type Warned = {
        warnings: { kind: string; roomId: string | null }[]
        rooms: {
          id: string
          participants: { applicationTermId: string; individualAccommodation: boolean }[]
        }[]
        unassigned: { applicationTermId: string; individualAccommodation: boolean }[]
      }
      const warned = async (): Promise<Warned> => (await list(t)) as unknown as Warned
      const makeMale = async (name: string, individual: boolean) => {
        const application = await makeApplication(name, [{ termId: t, status: "CONFIRMED" }])
        await prisma.application.update({
          where: { id: application.applicationId },
          data: { gender: "MALE", individualAccommodation: individual },
        })
        return application.rows[t]
      }
      const women = await makeRoom(t, "Dámský", 3)
      const [partner, other] = await Promise.all([
        makeMale("Partner", true),
        makeMale("Cizí", false),
      ])

      expect(
        (await warned()).unassigned.find((row) => row.applicationTermId === partner),
      ).toMatchObject({
        individualAccommodation: true,
      })
      expect((await assign(partner, women, undefined, t)).status).toBe(204)
      const afterPartner = await warned()
      expect(afterPartner.warnings.filter((warning) => warning.kind === "MIXED_GENDER")).toEqual([])
      expect(afterPartner.rooms.find((room) => room.id === women)?.participants).toMatchObject([
        { applicationTermId: partner, individualAccommodation: true },
      ])
      // a man without the request in the same women's room is still a warning
      expect((await assign(other, women, undefined, t)).status).toBe(204)
      expect((await warned()).warnings.map((warning) => warning.kind)).toContain("MIXED_GENDER")
    })

    it("confirms a warning knowingly, keeps it muted, forgets it when it no longer holds", async () => {
      const t = (
        await prisma.term.create({
          data: {
            organizationId,
            eventId,
            number: 10,
            name: "T10",
            startsOn: new Date("2027-09-01"),
            endsOn: new Date("2027-09-01"),
            priceCzk: 1000,
          },
        })
      ).id
      type Listed = {
        warnings: {
          kind: string
          roomId: string | null
          acknowledged: boolean
          note: string | null
          acknowledgedBy: string | null
        }[]
        summary: { violations: number; acknowledged: number; confirmedWithoutBed: number }
      }
      const listed = async (): Promise<Listed> => (await list(t)) as unknown as Listed
      const acknowledge = (body: unknown, session = cookie): Promise<Response> =>
        call(
          `/organizer/events/${eventId}/terms/${t}/room-warnings/acknowledgements`,
          "POST",
          body,
          session,
        )
      const tight = await makeRoom(t, "Těsný", 1)
      const [a, b] = await Promise.all(
        ["A", "B"].map((name) =>
          makeApplication(`Potvrzení ${name}`, [{ termId: t, status: "CONFIRMED" }]),
        ),
      )
      expect((await assign(a.rows[t], tight, undefined, t)).status).toBe(204)
      expect((await assign(b.rows[t], tight, undefined, t, true)).status).toBe(204)
      // taking the extra bed away overfills the room
      await prisma.room.update({ where: { id: tight }, data: { extraBeds: 0 } })
      expect((await listed()).summary).toMatchObject({ violations: 1, acknowledged: 0 })

      // nothing to confirm: a mixed-gender warning does not hold in a room of the same gender
      const missing = await acknowledge({ kind: "MIXED_GENDER", roomId: tight, note: "x" })
      expect(missing.status).toBe(409)
      expect(((await missing.json()) as { code: string }).code).toBe("ROOM_WARNING_NOT_FOUND")
      // a foreign organization and a participant get 403
      expect(
        (await acknowledge({ kind: "OVERCROWDED", roomId: tight, note: "x" }, foreignCookie))
          .status,
      ).toBe(403)
      expect(
        (await acknowledge({ kind: "OVERCROWDED", roomId: tight }, participantCookie)).status,
      ).toBe(403)

      const ok = await acknowledge({
        kind: "OVERCROWDED",
        roomId: tight,
        note: "  Rodina s dítětem  ",
      })
      expect(ok.status).toBe(204)
      const after = await listed()
      expect(after.summary).toMatchObject({ violations: 0, acknowledged: 1 })
      expect(after.warnings[0]).toMatchObject({
        acknowledged: true,
        note: "Rodina s dítětem",
        acknowledgedBy: expect.any(String),
      })

      // the situation changes: the room is not overcrowded any more, the confirmation is forgotten
      expect((await call(`${base(t)}/${b.rows[t]}`, "DELETE")).status).toBe(204)
      expect(await prisma.roomWarningAcknowledgement.count({ where: { termId: t } })).toBe(0)
      // and when it is overcrowded again it is a new, unconfirmed warning
      expect((await assign(b.rows[t], tight, undefined, t, true)).status).toBe(204)
      await prisma.room.update({ where: { id: tight }, data: { extraBeds: 0 } })
      expect((await listed()).summary).toMatchObject({ violations: 1, acknowledged: 0 })
    })
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
