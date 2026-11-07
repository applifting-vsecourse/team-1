// US-65: the organizer sets up transport to a term, the participant chooses it for each of their
// terms, the organizer sees who goes.
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type Summary = { id: string; name: string; departurePlace: string; participantsCount: number }
type TermListing = { termId: string; transports: Summary[]; ownCount: number }
type Listing = { terms: TermListing[] }
type Participants = {
  name: string | null
  termId: string
  participants: { applicationId: string }[]
}
type Offer = {
  terms: {
    termId: string
    selectedTransportId: string | null
    isOwn: boolean
    options: { id: string }[]
  }[]
}

describe("transport (integration)", () => {
  let prisma: PrismaService
  let organizer: string
  let otherOrganizer: string
  let participant: string
  let eventId: string
  let applicationId: string
  let termId: string
  let otherTermId: string
  let termEndsOn: string
  let transportId: string

  const send = (path: string, cookie: string, method = "GET", body?: unknown): Promise<Response> =>
    fetch(api(path), {
      method,
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  const base = () => `/organizer/events/${eventId}/transport`
  const mine = () => `/participant/applications/${applicationId}/transport`
  const listing = async (): Promise<Listing> => (await send(base(), organizer)).json()
  const inTerm = async (): Promise<TermListing> =>
    (await listing()).terms.find((term) => term.termId === termId)!
  const offer = async (): Promise<Offer> => (await send(mine(), participant)).json()
  const bus = () => ({
    termId,
    name: "Autobus z Prahy",
    departurePlace: "Praha, Černý Most · nástupiště 3",
    departureAt: `${termEndsOn}T06:00:00.000Z`,
  })

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
      include: { terms: { include: { term: true }, orderBy: { term: { startsOn: "asc" } } } },
    })
    applicationId = application.id
    eventId = application.eventId
    const active = application.terms.filter((row) => row.status !== "CANCELLED")
    termId = active[0].termId
    otherTermId = active[1].termId
    termEndsOn = active[0].term.endsOn.toISOString().slice(0, 10)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("lets the organizer add and edit a way of transport of a term", async () => {
    const created = await send(base(), organizer, "POST", bus())
    expect(created.status).toBe(204)
    const [added] = (await inTerm()).transports
    transportId = added.id
    expect(added).toMatchObject({ name: "Autobus z Prahy", participantsCount: 0 })

    const { name, departurePlace, departureAt } = bus()
    const fields = { name, departurePlace, departureAt }
    const edited = await send(`${base()}/${transportId}`, organizer, "PUT", {
      ...fields,
      name: "Autobus z Brna",
    })
    expect(edited.status).toBe(204)
    expect((await inTerm()).transports[0].name).toBe("Autobus z Brna")
  })

  it("rejects an invalid way of transport", async () => {
    const response = await send(base(), organizer, "POST", {
      ...bus(),
      name: " ",
      departureAt: "tomorrow",
    })
    expect(response.status).toBe(400)
  })

  it("does not offer a departure after the term ends", async () => {
    const late = new Date(`${termEndsOn}T12:00:00.000Z`)
    late.setUTCDate(late.getUTCDate() + 1)
    const response = await send(base(), organizer, "POST", {
      ...bus(),
      departureAt: late.toISOString(),
    })
    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("TRANSPORT_AFTER_TERM_END")
    const { name, departurePlace, departureAt } = bus()
    const fields = { name, departurePlace, departureAt }
    const edited = await send(`${base()}/${transportId}`, organizer, "PUT", {
      ...fields,
      departureAt: late.toISOString(),
    })
    expect(edited.status).toBe(400)
  })

  it("keeps transport of an organization away from another one and from participants", async () => {
    expect((await send(base(), otherOrganizer)).status).toBe(403)
    expect((await send(base(), otherOrganizer, "POST", bus())).status).toBe(403)
    const { name, departurePlace, departureAt } = bus()
    const fields = { name, departurePlace, departureAt }
    expect((await send(`${base()}/${transportId}`, otherOrganizer, "PUT", fields)).status).toBe(403)
    expect((await send(base(), participant)).status).toBe(403)
  })

  it("lets the participant choose a way of transport for each term separately", async () => {
    const before = (await offer()).terms.find((term) => term.termId === termId)!
    expect(before).toMatchObject({ selectedTransportId: null, isOwn: false })
    expect(before.options.map((option) => option.id)).toEqual([transportId])
    expect((await offer()).terms.find((term) => term.termId === otherTermId)!.options).toEqual([])

    const chosen = await send(mine(), participant, "PUT", { termId, transportId })
    expect(chosen.status).toBe(204)
    const after = await offer()
    expect(after.terms.find((term) => term.termId === termId)!.selectedTransportId).toBe(
      transportId,
    )
    expect(after.terms.find((term) => term.termId === otherTermId)!.selectedTransportId).toBeNull()
  })

  it("does not let a participant touch someone else's application or a transport of another term", async () => {
    expect((await send(mine(), organizer)).status).toBe(403)
    const foreign = await prisma.application.findFirstOrThrow({
      where: { user: { email: { not: "ucastnik@example.com" } } },
    })
    expect(
      (await send(`/participant/applications/${foreign.id}/transport`, participant)).status,
    ).toBe(403)
    expect(
      (await send(mine(), participant, "PUT", { termId: otherTermId, transportId })).status,
    ).toBe(403)
  })

  it("lists the participants of a transport", async () => {
    expect((await inTerm()).transports[0].participantsCount).toBe(1)

    const body: Participants = await (
      await send(`${base()}/${transportId}/participants`, organizer)
    ).json()
    expect(body).toMatchObject({ name: "Autobus z Brna", termId })
    expect(body.participants.map((p) => p.applicationId)).toEqual([applicationId])
  })

  it("counts and lists those who chose to go on their own, per term", async () => {
    expect((await send(mine(), participant, "PUT", { termId, transportId: null })).status).toBe(204)
    const counted = await inTerm()
    expect(counted.transports[0].participantsCount).toBe(0)
    expect(counted.ownCount).toBe(1)

    const own: Participants = await (
      await send(`${base()}/own/participants?termId=${termId}`, organizer)
    ).json()
    expect(own.name).toBeNull()
    expect(own.participants.map((p) => p.applicationId)).toEqual([applicationId])
    expect((await send(`${base()}/own/participants`, organizer)).status).toBe(400)
  })

  it("leaves out participants of a cancelled term", async () => {
    await send(mine(), participant, "PUT", { termId, transportId })
    await prisma.term.update({ where: { id: termId }, data: { cancelledAt: new Date() } })

    expect((await listing()).terms.some((term) => term.termId === termId)).toBe(false)
    expect((await offer()).terms.some((term) => term.termId === termId)).toBe(false)
  })
})
