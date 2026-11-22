// US-146: a participant with a confirmed term writes who they want to room with; the organizer sees it.
import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type WishTerm = { termId: string; roomWishes?: string[]; noRoomWishes?: boolean }
type Wish = { name: string; status: string; roomName: string | null }
type Overview = {
  rooms: { participants: { firstName: string; lastName: string; wishes: Wish[] }[] }[]
}

describe("room wishes (integration)", () => {
  let prisma: PrismaService
  let organizerCookie: string
  let participantCookie: string
  let organizationId: string
  let eventId: string
  let termId: string
  let roomId: string
  let counter = 0

  const makeApplication = async (
    status: "CONFIRMED" | "WAITLISTED" | "TO_EVALUATE",
    names: { firstName: string; lastName: string } = { firstName: "Test", lastName: "Přání" },
    individualAccommodation = false,
  ): Promise<{ applicationId: string; applicationTermId: string }> => {
    counter += 1
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "ucastnik@example.com" } })
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId,
        userId: user.id,
        accessToken: randomUUID(),
        ...names,
        birthDate: new Date("2010-01-01"),
        gender: "FEMALE",
        email: `us146-${counter}@example.com`,
        individualAccommodation,
        consentAt: new Date(),
        terms: { create: [{ organizationId, termId, status, priceCzk: 1000 }] },
      },
      include: { terms: true },
    })
    return { applicationId: application.id, applicationTermId: application.terms[0].id }
  }
  const save = (
    applicationId: string,
    names: unknown,
    cookie = participantCookie,
    term = termId,
    noRoomWishes?: unknown,
  ): Promise<Response> =>
    fetch(api(`/participant/applications/${applicationId}/terms/${term}/room-wishes`), {
      method: "PUT",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ names, noRoomWishes }),
    })
  const wishTermsOf = async (applicationId: string): Promise<WishTerm[]> => {
    const response = await fetch(api(`/participant/applications/${applicationId}`), {
      headers: { Cookie: participantCookie },
    })
    const body = (await response.json()) as {
      terms: WishTerm[]
    }
    return body.terms
  }
  const wishesOf = async (applicationId: string): Promise<string[] | undefined> =>
    (await wishTermsOf(applicationId)).find((term) => term.termId === termId)?.roomWishes
  const overview = async (): Promise<Overview> =>
    (
      await fetch(api(`/organizer/events/${eventId}/terms/${termId}/room-assignments`), {
        headers: { Cookie: organizerCookie },
      })
    ).json()

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    organizerCookie = await signIn("organizator@example.com", "password1")
    participantCookie = await signIn("ucastnik@example.com", "password4")
    const member = await prisma.organizationMember.findFirstOrThrow({
      where: { user: { email: "organizator@example.com" } },
    })
    organizationId = member.organizationId
    eventId = (
      await prisma.event.create({
        data: { organizationId, name: "US-146", publicToken: `us146-${randomUUID()}` },
      })
    ).id
    termId = (
      await prisma.term.create({
        data: {
          organizationId,
          eventId,
          number: 1,
          startsOn: new Date("2027-07-01"),
          endsOn: new Date("2027-07-07"),
          priceCzk: 1000,
        },
      })
    ).id
    roomId = (
      await prisma.room.create({
        data: { organizationId, termId, name: "Bříza 204", capacity: 6, gender: "FEMALE" },
      })
    ).id
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("requires a participant session", async () => {
    const { applicationId } = await makeApplication("CONFIRMED")
    expect((await save(applicationId, [], "")).status).toBe(401)
    expect((await save(applicationId, [], organizerCookie)).status).toBe(403)
  })

  it("writes, changes and deletes the wishes of a confirmed term", async () => {
    const { applicationId } = await makeApplication("CONFIRMED")
    expect(await wishesOf(applicationId)).toEqual([])
    expect((await save(applicationId, ["  Eva Černá ", "Klára Veselá", ""])).status).toBe(204)
    expect(await wishesOf(applicationId)).toEqual(["Eva Černá", "Klára Veselá"])
    expect((await save(applicationId, ["Tereza Malá"])).status).toBe(204)
    expect(await wishesOf(applicationId)).toEqual(["Tereza Malá"])
    expect((await save(applicationId, [])).status).toBe(204)
    expect(await wishesOf(applicationId)).toEqual([])
  })

  it("remembers a no-wishes response per term and replaces it when real wishes are saved", async () => {
    const { applicationId } = await makeApplication("CONFIRMED")
    const otherTerm = await prisma.term.create({
      data: {
        organizationId,
        eventId,
        number: 3,
        startsOn: new Date("2027-08-08"),
        endsOn: new Date("2027-08-14"),
        priceCzk: 1000,
      },
    })
    await prisma.applicationTerm.create({
      data: {
        organizationId,
        applicationId,
        termId: otherTerm.id,
        status: "CONFIRMED",
        priceCzk: 1000,
      },
    })
    const decline = (): Promise<Response> =>
      save(applicationId, [], participantCookie, termId, true)
    expect((await decline()).status).toBe(204)
    expect((await decline()).status).toBe(204)
    expect(await wishTermsOf(applicationId)).toEqual([
      expect.objectContaining({ termId, noRoomWishes: true, roomWishes: [] }),
      expect.objectContaining({ termId: otherTerm.id, noRoomWishes: false, roomWishes: [] }),
    ])

    expect((await save(applicationId, ["Eva Černá"])).status).toBe(204)
    expect((await decline()).status).toBe(409)
    expect((await wishTermsOf(applicationId))[0]).toMatchObject({
      roomWishes: ["Eva Černá"],
      noRoomWishes: false,
    })
    expect((await save(applicationId, [])).status).toBe(204)
    expect((await wishTermsOf(applicationId))[0]).toMatchObject({
      roomWishes: [],
      noRoomWishes: false,
    })
  })

  it("rejects the no-wishes action after the organizer publishes rooms", async () => {
    const { applicationId } = await makeApplication("CONFIRMED")
    await prisma.term.update({
      where: { id: termId },
      data: { roomsPublishedAt: new Date() },
    })
    try {
      expect((await save(applicationId, [], participantCookie, termId, true)).status).toBe(409)
      expect((await wishTermsOf(applicationId))[0]).toMatchObject({ noRoomWishes: false })
    } finally {
      await prisma.term.update({ where: { id: termId }, data: { roomsPublishedAt: null } })
    }
  })

  it("rejects more than three names and malformed input", async () => {
    const { applicationId } = await makeApplication("CONFIRMED")
    expect((await save(applicationId, ["a", "b", "c", "d"])).status).toBe(400)
    expect((await save(applicationId, "Eva")).status).toBe(400)
    expect((await save(applicationId, [1])).status).toBe(400)
    expect((await save(applicationId, [], participantCookie, termId, null)).status).toBe(400)
    expect((await save(applicationId, ["Eva"], participantCookie, termId, true)).status).toBe(400)
  })

  it("is not offered without a confirmed term", async () => {
    for (const status of ["WAITLISTED", "TO_EVALUATE"] as const) {
      const { applicationId } = await makeApplication(status)
      expect(await wishesOf(applicationId)).toBeUndefined()
      const response = await save(applicationId, ["Eva Černá"])
      expect(response.status).toBe(409)
      expect((await response.json()).code).toBe("ROOM_WISHES_NOT_AVAILABLE")
    }
    const { applicationId } = await makeApplication("CONFIRMED", undefined, true)
    expect(await wishesOf(applicationId)).toBeUndefined()
    expect((await save(applicationId, ["Eva Černá"])).status).toBe(409)
  })

  it("is 403 for a foreign application", async () => {
    const other = await prisma.application.findFirstOrThrow({
      where: { NOT: { user: { email: "ucastnik@example.com" } } },
      include: { terms: true },
    })
    expect((await save(other.id, ["Eva"], participantCookie, other.terms[0].termId)).status).toBe(
      403,
    )
  })

  it("changes neither the status nor the room, and the organizer sees fulfilled and unfulfilled wishes", async () => {
    const jana = await makeApplication("CONFIRMED", { firstName: "Jana", lastName: "Nováková" })
    const eva = await makeApplication("CONFIRMED", { firstName: "Eva", lastName: "Černá" })
    for (const row of [jana, eva]) {
      await prisma.roomAssignment.create({
        data: { organizationId, applicationTermId: row.applicationTermId, roomId },
      })
    }
    expect((await save(jana.applicationId, ["eva cerna", "Tereza Malá"])).status).toBe(204)

    const row = await prisma.applicationTerm.findUniqueOrThrow({
      where: { id: jana.applicationTermId },
      include: { roomAssignment: true },
    })
    expect(row.status).toBe("CONFIRMED")
    expect(row.roomAssignment?.roomId).toBe(roomId)

    const participants = (await overview()).rooms.flatMap((room) => room.participants)
    expect(participants.find((p) => p.lastName === "Nováková")?.wishes).toEqual([
      { name: "eva cerna", status: "fulfilled", roomName: expect.any(String) },
      { name: "Tereza Malá", status: "impossible", roomName: null },
    ])
    expect(participants.find((p) => p.lastName === "Černá")?.wishes).toEqual([])
  })

  it("hides saved wishes of a participant who switched to individual accommodation", async () => {
    const jana = await makeApplication("CONFIRMED", { firstName: "Ida", lastName: "Individuální" })
    await prisma.roomAssignment.create({
      data: { organizationId, applicationTermId: jana.applicationTermId, roomId },
    })
    expect((await save(jana.applicationId, ["Eva Černá"])).status).toBe(204)
    await prisma.application.update({
      where: { id: jana.applicationId },
      data: { individualAccommodation: true },
    })
    const participants = (await overview()).rooms.flatMap((room) => room.participants)
    expect(participants.find((p) => p.lastName === "Individuální")?.wishes).toEqual([])
  })

  describe("deletes the wishes when the confirmation lapses", () => {
    const setStatus = (applicationId: string, status: string): Promise<Response> =>
      fetch(api(`/organizer/applications/${applicationId}/terms/${termId}/status`), {
        method: "PATCH",
        headers: { Cookie: organizerCookie, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
    const stored = async (applicationTermId: string): Promise<string[]> =>
      (await prisma.applicationTerm.findUniqueOrThrow({ where: { id: applicationTermId } }))
        .roomWishes

    it.each(["CANCELLED", "WAITLISTED"])("when the organizer sets %s", async (status) => {
      const row = await makeApplication("CONFIRMED")
      expect((await save(row.applicationId, ["Eva Černá"])).status).toBe(204)
      expect(await stored(row.applicationTermId)).toEqual(["Eva Černá"])
      expect((await setStatus(row.applicationId, status)).status).toBeLessThan(300)
      expect(await stored(row.applicationTermId)).toEqual([])
    })

    it("clears the no-wishes response when confirmation lapses", async () => {
      const row = await makeApplication("CONFIRMED")
      expect((await save(row.applicationId, [], participantCookie, termId, true)).status).toBe(204)
      expect((await setStatus(row.applicationId, "WAITLISTED")).status).toBeLessThan(300)
      expect(
        await prisma.applicationTerm.findUniqueOrThrow({
          where: { id: row.applicationTermId },
          select: { noRoomWishes: true },
        }),
      ).toEqual({ noRoomWishes: false })
    })

    it("when the organizer cancels the term", async () => {
      const otherTermId = (
        await prisma.term.create({
          data: {
            organizationId,
            eventId,
            number: 2,
            startsOn: new Date("2027-08-01"),
            endsOn: new Date("2027-08-07"),
            priceCzk: 1000,
          },
        })
      ).id
      const row = await makeApplication("CONFIRMED")
      await prisma.applicationTerm.update({
        where: { id: row.applicationTermId },
        data: { termId: otherTermId, roomWishes: ["Eva Černá"] },
      })
      const response = await fetch(
        api(`/organizer/events/${eventId}/terms/${otherTermId}/cancel`),
        {
          method: "POST",
          headers: { Cookie: organizerCookie, "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Test" }),
        },
      )
      expect(response.status).toBe(201)
      expect(await stored(row.applicationTermId)).toEqual([])
    })
  })
})
