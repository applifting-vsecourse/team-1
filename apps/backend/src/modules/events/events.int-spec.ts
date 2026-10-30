import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type EventBody = {
  id: string
  name: string
  organizationName: string
  publicToken: string
  applicationsOpen: boolean
  missing: string[]
}

describe("organizer events (integration)", () => {
  let prisma: PrismaService
  let cookieA: string
  let cookieB: string

  const post = (cookie: string, body: object): Promise<Response> =>
    fetch(api("/organizer/events"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(body),
    })

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookieA = await signIn("organizator@example.com", "password1")
    cookieB = await signIn("organizator2@example.com", "password2")
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("needs an organizer session", async () => {
    expect((await fetch(api("/organizer/events"))).status).toBe(401)
    const participant = await signIn("ucastnik@example.com", "password4")
    const response = await fetch(api("/organizer/events"), { headers: { Cookie: participant } })
    expect(response.status).toBe(403)
  })

  it("creates an event, lists it, and keeps its link closed until it is set up", async () => {
    const response = await post(cookieA, {
      name: "Jarní víkend Lipno 2027",
      location: "Lipno nad Vltavou",
    })

    expect(response.status).toBe(201)
    const created = (await response.json()) as EventBody
    expect(created).toMatchObject({
      name: "Jarní víkend Lipno 2027",
      organizationName: "Letní kemp z. s.",
      applicationsOpen: false,
      missing: ["TERM", "ROOM"],
    })

    const list = await fetch(api("/organizer/events"), { headers: { Cookie: cookieA } })
    const events = (await list.json()) as EventBody[]
    expect(events.map((event) => event.id)).toContain(created.id)

    const publicPage = await fetch(api(`/public/events/${created.publicToken}`))
    expect(publicPage.status).toBe(404)
  })

  it("opens the public page once a term and a room exist", async () => {
    const created = (await (await post(cookieA, { name: "Podzim" })).json()) as EventBody
    const event = await prisma.event.findUniqueOrThrow({ where: { id: created.id } })
    await prisma.term.create({
      data: {
        organizationId: event.organizationId,
        eventId: event.id,
        name: "Týden",
        startsOn: new Date("2027-10-01"),
        endsOn: new Date("2027-10-07"),
        priceCzk: 1000,
      },
    })
    await prisma.room.create({
      data: {
        organizationId: event.organizationId,
        eventId: event.id,
        name: "A",
        capacity: 4,
        gender: "FEMALE",
      },
    })

    const detail = await fetch(api(`/organizer/events/${created.id}`), {
      headers: { Cookie: cookieA },
    })
    expect(await detail.json()).toMatchObject({
      applicationsOpen: true,
      missing: [],
      startsOn: "2027-10-01",
      endsOn: "2027-10-07",
      terms: [
        {
          name: "Týden",
          startsOn: "2027-10-01",
          endsOn: "2027-10-07",
          capacity: 4,
          confirmedCount: 0,
        },
      ],
    })
    expect((await fetch(api(`/public/events/${created.publicToken}`))).status).toBe(200)
  })

  it("rejects a missing name", async () => {
    const response = await post(cookieA, { description: "bez názvu" })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: "VALIDATION_FAILED" })
  })

  it("keeps organizations apart", async () => {
    const created = (await (await post(cookieA, { name: "Jen pro A" })).json()) as EventBody

    const listB = (await (
      await fetch(api("/organizer/events"), { headers: { Cookie: cookieB } })
    ).json()) as EventBody[]
    expect(listB.map((event) => event.id)).not.toContain(created.id)

    const detail = await fetch(api(`/organizer/events/${created.id}`), {
      headers: { Cookie: cookieB },
    })
    expect(detail.status).toBe(403)

    const organizationA = await prisma.organization.findFirstOrThrow({
      where: { name: "Letní kemp z. s." },
    })
    const foreign = await post(cookieB, { organizationId: organizationA.id, name: "Cizí" })
    expect(foreign.status).toBe(403)
  })

  it("deletes only an event nobody has applied to", async () => {
    const remove = (cookie: string, id: string): Promise<Response> =>
      fetch(api(`/organizer/events/${id}`), { method: "DELETE", headers: { Cookie: cookie } })
    const created = (await (await post(cookieA, { name: "Ke smazání" })).json()) as EventBody

    expect((await remove(cookieB, created.id)).status).toBe(403)
    expect((await remove(cookieA, created.id)).status).toBe(204)
    expect(await prisma.event.findUnique({ where: { id: created.id } })).toBeNull()

    const applied = await prisma.event.findFirstOrThrow({
      where: { organization: { name: "Letní kemp z. s." }, applications: { some: {} } },
    })
    const conflict = await remove(cookieA, applied.id)
    expect(conflict.status).toBe(409)
    expect(await conflict.json()).toMatchObject({ code: "EVENT_HAS_APPLICATIONS" })
    expect(await prisma.event.findUnique({ where: { id: applied.id } })).not.toBeNull()
  })

  describe("evaluation mode (US-101)", () => {
    const patch = (cookie: string, id: string, body: object): Promise<Response> =>
      fetch(api(`/organizer/events/${id}/evaluation-mode`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify(body),
      })

    it("defaults to automatic, also for events from the seed", async () => {
      const created = (await (await post(cookieA, { name: "Výchozí režim" })).json()) as EventBody
      expect(created).toMatchObject({ evaluationMode: "AUTOMATIC", evaluationModeLocked: false })
      const seeded = await prisma.event.findMany()
      expect(seeded.every((event) => event.evaluationMode === "AUTOMATIC")).toBe(true)
    })

    it("changes the mode before applications open and locks it afterwards", async () => {
      const created = (await (await post(cookieA, { name: "Zamykání" })).json()) as EventBody
      const manual = await patch(cookieA, created.id, { evaluationMode: "MANUAL" })
      expect(manual.status).toBe(200)
      expect(await manual.json()).toMatchObject({
        evaluationMode: "MANUAL",
        evaluationModeLocked: false,
      })
      expect((await patch(cookieA, created.id, { evaluationMode: "nope" })).status).toBe(400)

      const event = await prisma.event.findUniqueOrThrow({ where: { id: created.id } })
      await prisma.term.create({
        data: {
          organizationId: event.organizationId,
          eventId: event.id,
          name: "Týden",
          startsOn: new Date("2027-10-01"),
          endsOn: new Date("2027-10-07"),
          priceCzk: 1000,
        },
      })
      await prisma.room.create({
        data: {
          organizationId: event.organizationId,
          eventId: event.id,
          name: "A",
          capacity: 4,
          gender: "FEMALE",
        },
      })

      const locked = await patch(cookieA, created.id, { evaluationMode: "AUTOMATIC" })
      expect(locked.status).toBe(409)
      expect(await locked.json()).toMatchObject({ code: "EVALUATION_MODE_LOCKED" })
      expect(
        (await prisma.event.findUniqueOrThrow({ where: { id: created.id } })).evaluationMode,
      ).toBe("MANUAL")
      const detail = await fetch(api(`/organizer/events/${created.id}`), {
        headers: { Cookie: cookieA },
      })
      expect(await detail.json()).toMatchObject({
        evaluationMode: "MANUAL",
        evaluationModeLocked: true,
      })
    })

    it("keeps organizations and accounts apart", async () => {
      const created = (await (await post(cookieA, { name: "Cizí režim" })).json()) as EventBody
      expect((await patch(cookieB, created.id, { evaluationMode: "MANUAL" })).status).toBe(403)
      expect((await patch("", created.id, { evaluationMode: "MANUAL" })).status).toBe(401)
      const participant = await signIn("ucastnik@example.com", "password4")
      expect((await patch(participant, created.id, { evaluationMode: "MANUAL" })).status).toBe(403)
    })
  })
})
