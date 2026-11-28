import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed } from "@/test/integration/test-api"

type PublicEventBody = {
  name: string
  terms: {
    id: string
    name: string
    startsOn: string
    endsOn: string
    priceCzk: number
  }[]
}

describe("public event for the application form (integration)", () => {
  let prisma: PrismaService

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("opens without a session and lists the terms with prices by start date", async () => {
    const response = await fetch(api("/public/events/demo-letni-kemp-2027"))

    expect(response.status).toBe(200)
    const body = (await response.json()) as PublicEventBody
    expect(body.name).toBe("Letní kemp 2027")
    expect(body.terms.map((term) => term.name)).toEqual(["1. týden", "2. týden"])
    expect(body.terms[0]).toMatchObject({
      startsOn: "2027-07-04",
      priceCzk: 4500,
    })
  })

  it("exposes nothing of the organization", async () => {
    const response = await fetch(api("/public/events/demo-letni-kemp-2027"))
    const text = await response.text()

    expect(text).not.toContain("organizationId")
    expect(text).not.toContain("bankAccount")
    expect(text).not.toContain("2900123456")
  })

  it("answers an unknown link with 404 and a code to translate", async () => {
    const response = await fetch(api("/public/events/does-not-exist"))

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    })
  })

  it("answers an event with a term without rooms like an unknown link", async () => {
    const event = await prisma.event.findUniqueOrThrow({
      where: { publicToken: "demo-horsky-vikend-2027" },
    })
    await prisma.room.deleteMany({ where: { term: { eventId: event.id } } })

    const response = await fetch(api("/public/events/demo-horsky-vikend-2027"))

    expect(response.status).toBe(404)
  })

  it("answers every reason an event is closed with exactly the body of an unknown link (#738)", async () => {
    const unknown = await fetch(api("/public/events/does-not-exist"))
    const unknownBody: unknown = await unknown.json()

    const closed = async (token: string): Promise<{ status: number; body: unknown }> => {
      const response = await fetch(api(`/public/events/${token}`))
      return { status: response.status, body: await response.json() }
    }

    // All terms cancelled.
    const cancelled = await prisma.event.findUniqueOrThrow({
      where: { publicToken: "demo-letni-kemp-plny" },
    })
    await prisma.term.updateMany({
      where: { eventId: cancelled.id },
      data: { cancelledAt: new Date() },
    })
    // Evaluation mode not chosen yet (US-560).
    await prisma.event.update({
      where: { publicToken: "demo-rodinny-vikend-2027" },
      data: { evaluationModePending: true },
    })
    // No term at all.
    const empty = await prisma.event.findUniqueOrThrow({
      where: { publicToken: "demo-zimni-vyjezd-2028" },
    })
    await prisma.term.deleteMany({ where: { eventId: empty.id } })

    for (const token of [
      "demo-letni-kemp-plny",
      "demo-rodinny-vikend-2027",
      "demo-zimni-vyjezd-2028",
      "demo-horsky-vikend-2027", // no rooms, closed in the test above
    ]) {
      expect(await closed(token)).toEqual({ status: 404, body: unknownBody })
    }
  })
})
