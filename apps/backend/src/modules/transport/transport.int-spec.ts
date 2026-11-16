// US-65: the organizer sets up transport to a term, the participant chooses it for each of their
// terms, the organizer sees who goes.
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type Summary = {
  id: string
  kind: string
  name: string
  departurePlace: string | null
  instructions: string | null
  participantsCount: number
}
type TermListing = { termId: string; transports: Summary[] }
type Listing = { terms: TermListing[] }
type Participants = {
  name: string
  kind: string
  termId: string
  participants: { applicationId: string }[]
}
type Offer = {
  terms: {
    termId: string
    selectedTransportId: string | null
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
    kind: "SCHEDULED",
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
    expect(before).toMatchObject({ selectedTransportId: null })
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

  it("adds own transport on request, at most one per term, with instructions only", async () => {
    expect((await inTerm()).transports.some((item) => item.kind === "OWN")).toBe(false)
    const own = {
      kind: "OWN",
      termId,
      instructions: "Parkoviště za bránou, vjezd z hlavní silnice.",
    }
    expect((await send(base(), organizer, "POST", own)).status).toBe(204)
    const second = await send(base(), organizer, "POST", own)
    expect(second.status).toBe(409)
    expect((await second.json()).code).toBe("TRANSPORT_OWN_EXISTS")

    const added = (await inTerm()).transports.find((item) => item.kind === "OWN")!
    expect(added).toMatchObject({
      name: "",
      departurePlace: null,
      instructions: "Parkoviště za bránou, vjezd z hlavní silnice.",
    })
    // Own transport is chosen like any other and its participants are listed the same way.
    expect((await send(mine(), participant, "PUT", { termId, transportId: added.id })).status).toBe(
      204,
    )
    const listed: Participants = await (
      await send(`${base()}/${added.id}/participants`, organizer)
    ).json()
    expect(listed).toMatchObject({ kind: "OWN", name: "" })
    expect(listed.participants.map((p) => p.applicationId)).toEqual([applicationId])
    expect((await send(`${base()}/${added.id}?confirmed=true`, organizer, "DELETE")).status).toBe(
      204,
    )
  })

  it("deletes a transport nobody chose without a confirmation", async () => {
    await send(base(), organizer, "POST", {
      kind: "SCHEDULED",
      termId,
      name: "Empty bus",
      departurePlace: "Brno",
      departureAt: "2027-07-01T06:00:00.000Z",
    })
    const empty = (await inTerm()).transports.find((item) => item.name === "Empty bus")!
    expect((await send(`${base()}/${empty.id}`, organizer, "DELETE")).status).toBe(204)
  })

  it("answers 409 when own transport is added at the same time", async () => {
    const own = { kind: "OWN", termId }
    const results = await Promise.all([
      send(base(), organizer, "POST", own),
      send(base(), organizer, "POST", own),
    ])
    expect(results.map((r) => r.status).sort()).toEqual([204, 409])
    await prisma.transport.deleteMany({ where: { termId, kind: "OWN" } })
  })

  it("requires name, place and time of a ride but not of own transport", async () => {
    const incomplete = await send(base(), organizer, "POST", {
      kind: "SCHEDULED",
      termId,
      name: "X",
    })
    expect(incomplete.status).toBe(400)
  })

  it("deletes a transport and leaves its participants with no transport chosen", async () => {
    await send(mine(), participant, "PUT", { termId, transportId })
    expect((await send(`${base()}/${transportId}`, otherOrganizer, "DELETE")).status).toBe(403)
    expect((await inTerm()).transports).toHaveLength(1)

    // Somebody chose it: without the confirmation the server refuses and says how many.
    const refused = await send(`${base()}/${transportId}`, organizer, "DELETE")
    expect(refused.status).toBe(409)
    expect(await refused.json()).toMatchObject({
      code: "TRANSPORT_HAS_PARTICIPANTS",
      params: { count: "1" },
    })
    expect((await inTerm()).transports).toHaveLength(1)

    expect(
      (await send(`${base()}/${transportId}?confirmed=true`, organizer, "DELETE")).status,
    ).toBe(204)
    expect((await inTerm()).transports).toHaveLength(0)
    const row = (await offer()).terms.find((term) => term.termId === termId)!
    expect(row.selectedTransportId).toBeNull()
    expect((await send(`${base()}/${transportId}`, organizer, "DELETE")).status).toBe(403)
  })

  it("leaves out participants of a cancelled term", async () => {
    await send(mine(), participant, "PUT", { termId, transportId })
    await prisma.term.update({ where: { id: termId }, data: { cancelledAt: new Date() } })

    expect((await listing()).terms.some((term) => term.termId === termId)).toBe(false)
    expect((await offer()).terms.some((term) => term.termId === termId)).toBe(false)
    // The overview no longer asks for a transport to it.
    const overview: { terms: { termId: string; transportOffered: boolean }[] } = await (
      await send(`/participant/applications/${applicationId}`, participant)
    ).json()
    expect(overview.terms.find((term) => term.termId === termId)?.transportOffered).toBe(false)
  })
})
