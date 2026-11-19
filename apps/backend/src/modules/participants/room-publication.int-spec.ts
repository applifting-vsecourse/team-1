// US-144: the organizer publishes the room assignment of a term; confirmed participants then see their room.
import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type TermDto = { termId: string; status: string; room?: { name: string | null } }
type ApplicationDto = { id: string; terms: TermDto[] }

describe("room publication (integration)", () => {
  let prisma: PrismaService
  let organizerCookie: string
  let participantCookie: string
  let foreignCookie: string
  let organizationId: string
  let eventId: string
  let termId: string
  let roomId: string
  let counter = 0

  const publish = (published: unknown, cookie = organizerCookie): Promise<Response> =>
    fetch(api(`/organizer/events/${eventId}/terms/${termId}/rooms-published`), {
      method: "PATCH",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ published }),
    })
  const roomsOf = async (): Promise<{ roomsPublished: boolean }> =>
    (
      await fetch(api(`/organizer/events/${eventId}/terms/${termId}/rooms`), {
        headers: { Cookie: organizerCookie },
      })
    ).json()
  const termOf = async (applicationId: string): Promise<TermDto> => {
    const response = await fetch(api(`/participant/applications/${applicationId}`), {
      headers: { Cookie: participantCookie },
    })
    expect(response.status).toBe(200)
    const body = (await response.json()) as ApplicationDto
    return body.terms.find((term) => term.termId === termId) as TermDto
  }

  const makeApplication = async (
    status: "CONFIRMED" | "WAITLISTED",
    individualAccommodation = false,
    room = true,
  ): Promise<string> => {
    counter += 1
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "ucastnik@example.com" } })
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId,
        userId: user.id,
        accessToken: randomUUID(),
        firstName: "Test",
        lastName: `Pokoj ${counter}`,
        birthDate: new Date("2010-01-01"),
        gender: "FEMALE",
        email: `us144-${counter}@example.com`,
        individualAccommodation,
        consentAt: new Date(),
        terms: { create: [{ organizationId, termId, status, priceCzk: 1000 }] },
      },
      include: { terms: true },
    })
    if (room) {
      await prisma.roomAssignment.create({
        data: { organizationId, applicationTermId: application.terms[0].id, roomId },
      })
    }
    return application.id
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    organizerCookie = await signIn("organizator@example.com", "password1")
    participantCookie = await signIn("ucastnik@example.com", "password4")
    foreignCookie = await signIn("organizator2@example.com", "password2")
    const member = await prisma.organizationMember.findFirstOrThrow({
      where: { user: { email: "organizator@example.com" } },
    })
    organizationId = member.organizationId
    const event = await prisma.event.create({
      data: { organizationId, name: "US-144", publicToken: `us144-${randomUUID()}` },
    })
    eventId = event.id
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
        data: { organizationId, termId, name: "Bříza 204", capacity: 4, gender: "FEMALE" },
      })
    ).id
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("protects the toggle by session, role and organization", async () => {
    expect((await publish(true, "")).status).toBe(401)
    expect((await publish(true, participantCookie)).status).toBe(403)
    expect((await publish(true, foreignCookie)).status).toBe(403)
    expect((await publish("yes")).status).toBe(400)
  })

  it("is unpublished by default and the participant sees no room", async () => {
    const id = await makeApplication("CONFIRMED")
    expect((await roomsOf()).roomsPublished).toBe(false)
    expect((await termOf(id)).room).toBeUndefined()
  })

  it("shows the room name after publishing and hides it again when taken back", async () => {
    const id = await makeApplication("CONFIRMED")
    expect((await publish(true)).status).toBe(204)
    expect((await roomsOf()).roomsPublished).toBe(true)
    expect((await termOf(id)).room).toEqual({ name: "Bříza 204" })
    expect((await publish(true)).status).toBe(204)
    expect((await publish(false)).status).toBe(204)
    expect((await roomsOf()).roomsPublished).toBe(false)
    expect((await termOf(id)).room).toBeUndefined()
  })

  it("says no room is assigned yet for a participant without a room, and shows changes at once", async () => {
    const id = await makeApplication("CONFIRMED", false, false)
    expect((await publish(true)).status).toBe(204)
    expect((await termOf(id)).room).toEqual({ name: null })
    const row = await prisma.applicationTerm.findFirstOrThrow({
      where: { applicationId: id, termId },
    })
    await prisma.roomAssignment.create({
      data: { organizationId, applicationTermId: row.id, roomId },
    })
    expect((await termOf(id)).room).toEqual({ name: "Bříza 204" })
    await prisma.roomAssignment.delete({ where: { applicationTermId: row.id } })
    expect((await termOf(id)).room).toEqual({ name: null })
  })

  it("shows nothing about a room to a waitlisted or individually accommodated participant", async () => {
    const waitlisted = await makeApplication("WAITLISTED", false, false)
    const individual = await makeApplication("CONFIRMED", true)
    expect((await publish(true)).status).toBe(204)
    expect((await termOf(waitlisted)).room).toBeUndefined()
    const term = await termOf(individual)
    expect(term.room).toBeUndefined()
    expect(JSON.stringify(term)).not.toMatch(/room|individual/i)
  })
})
