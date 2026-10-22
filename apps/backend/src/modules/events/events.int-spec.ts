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
})
