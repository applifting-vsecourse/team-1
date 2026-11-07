// US-65: the organizer sets up transport, the participant chooses it, the organizer sees who goes.
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type Summary = { id: string; name: string; departurePlace: string; participantsCount: number }
type Listing = { transports: Summary[]; ownCount: number }
type Participants = {
  name: string | null
  groups: { participants: { applicationId: string; name: string }[] }[]
}

describe("transport (integration)", () => {
  let prisma: PrismaService
  let organizer: string
  let otherOrganizer: string
  let participant: string
  let eventId: string
  let applicationId: string
  let transportId: string

  const send = (path: string, cookie: string, method = "GET", body?: unknown): Promise<Response> =>
    fetch(api(path), {
      method,
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  const listing = async (): Promise<Listing> =>
    (await send(`/organizer/events/${eventId}/transport`, organizer)).json()
  const bus = {
    name: "Autobus z Prahy",
    departurePlace: "Praha, Černý Most · nástupiště 3",
    departureAt: "2027-07-12T06:00:00.000Z",
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    organizer = await signIn("organizator@example.com", "password1")
    otherOrganizer = await signIn("organizator2@example.com", "password2")
    participant = await signIn("ucastnik@example.com", "password4")
    const application = await prisma.application.findFirstOrThrow({
      where: {
        user: { email: "ucastnik@example.com" },
        event: { publicToken: "demo-letni-kemp-2027" },
      },
    })
    applicationId = application.id
    eventId = application.eventId
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("lets the organizer add and edit a way of transport", async () => {
    const created = await send(`/organizer/events/${eventId}/transport`, organizer, "POST", bus)
    expect(created.status).toBe(204)
    const [added] = (await listing()).transports
    transportId = added.id
    expect(added).toMatchObject({ name: bus.name, departurePlace: bus.departurePlace })

    const edited = await send(
      `/organizer/events/${eventId}/transport/${transportId}`,
      organizer,
      "PUT",
      { ...bus, name: "Autobus z Brna" },
    )
    expect(edited.status).toBe(204)
    expect((await listing()).transports[0].name).toBe("Autobus z Brna")
  })

  it("rejects an invalid way of transport", async () => {
    const response = await send(`/organizer/events/${eventId}/transport`, organizer, "POST", {
      ...bus,
      name: " ",
      departureAt: "tomorrow",
    })
    expect(response.status).toBe(400)
  })

  it("keeps transport of an organization away from another one and from participants", async () => {
    expect((await send(`/organizer/events/${eventId}/transport`, otherOrganizer)).status).toBe(403)
    expect(
      (await send(`/organizer/events/${eventId}/transport`, otherOrganizer, "POST", bus)).status,
    ).toBe(403)
    expect(
      (
        await send(
          `/organizer/events/${eventId}/transport/${transportId}`,
          otherOrganizer,
          "PUT",
          bus,
        )
      ).status,
    ).toBe(403)
    expect((await send(`/organizer/events/${eventId}/transport`, participant)).status).toBe(403)
  })

  it("lets the participant choose a way of transport for their application", async () => {
    const offer = await (
      await send(`/participant/applications/${applicationId}/transport`, participant)
    ).json()
    expect(offer.selectedTransportId).toBeNull()
    expect(offer.options.map((option: { id: string }) => option.id)).toEqual([transportId])

    const chosen = await send(
      `/participant/applications/${applicationId}/transport`,
      participant,
      "PUT",
      { transportId },
    )
    expect(chosen.status).toBe(204)
    const after = await (
      await send(`/participant/applications/${applicationId}/transport`, participant)
    ).json()
    expect(after.selectedTransportId).toBe(transportId)
  })

  it("does not let a participant touch someone else's application or a foreign transport", async () => {
    const organizerSession = await send(
      `/participant/applications/${applicationId}/transport`,
      organizer,
    )
    expect(organizerSession.status).toBe(403)
    const foreign = await prisma.application.findFirstOrThrow({
      where: { user: { email: { not: "ucastnik@example.com" } } },
    })
    expect(
      (await send(`/participant/applications/${foreign.id}/transport`, participant)).status,
    ).toBe(403)
    const otherEvent = await prisma.event.findFirstOrThrow({ where: { id: { not: eventId } } })
    const elsewhere = await prisma.transport.create({
      data: {
        organizationId: otherEvent.organizationId,
        eventId: otherEvent.id,
        name: "Elsewhere",
        departurePlace: "Somewhere",
        departureAt: new Date("2027-07-12T06:00:00.000Z"),
      },
    })
    expect(
      (
        await send(`/participant/applications/${applicationId}/transport`, participant, "PUT", {
          transportId: elsewhere.id,
        })
      ).status,
    ).toBe(403)
  })

  it("lists the participants by transport, grouped by term", async () => {
    const counted = await listing()
    expect(counted.transports[0].participantsCount).toBe(1)

    const response = await send(
      `/organizer/events/${eventId}/transport/${transportId}/participants`,
      organizer,
    )
    const body: Participants = await response.json()
    expect(body.name).toBe("Autobus z Brna")
    expect(body.groups.length).toBeGreaterThan(0)
    for (const group of body.groups) {
      expect(group.participants.map((p) => p.applicationId)).toEqual([applicationId])
    }
  })

  it("counts participants without a chosen transport as own transport", async () => {
    const chosen = await send(
      `/participant/applications/${applicationId}/transport`,
      participant,
      "PUT",
      { transportId: null },
    )
    expect(chosen.status).toBe(204)
    const counted = await listing()
    expect(counted.transports[0].participantsCount).toBe(0)
    expect(counted.ownCount).toBeGreaterThan(0)

    const own: Participants = await (
      await send(`/organizer/events/${eventId}/transport/own/participants`, organizer)
    ).json()
    expect(own.name).toBeNull()
    expect(own.groups.flatMap((group) => group.participants).map((p) => p.applicationId)).toContain(
      applicationId,
    )
  })

  it("leaves out participants whose terms of the event are all cancelled", async () => {
    await send(`/participant/applications/${applicationId}/transport`, participant, "PUT", {
      transportId,
    })
    await prisma.term.updateMany({ where: { eventId }, data: { cancelledAt: new Date() } })

    expect((await listing()).transports[0].participantsCount).toBe(0)
    const body: Participants = await (
      await send(`/organizer/events/${eventId}/transport/${transportId}/participants`, organizer)
    ).json()
    expect(body.groups).toEqual([])
  })
})
