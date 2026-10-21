import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type TermBody = {
  id: string
  name: string
  startsOn: string
  endsOn: string
  priceCzk: number
  capacity: number
  confirmedCount: number
  waitlistedCount: number
  cancelledAt: string | null
  cancelReason: string | null
}

describe("organizer terms (integration)", () => {
  let prisma: PrismaService
  let cookieA: string
  let cookieB: string
  let eventId: string

  const send = (cookie: string | null, method: string, path: string, body?: object) =>
    fetch(api(path), {
      method,
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  const termsPath = (id = eventId) => `/organizer/events/${id}/terms`
  const list = async (cookie = cookieA) =>
    (await (await send(cookie, "GET", termsPath())).json()) as TermBody[]

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookieA = await signIn("organizator@example.com", "password1")
    cookieB = await signIn("organizator2@example.com", "password2")
    const created = await send(cookieA, "POST", "/organizer/events", { name: "Termíny" })
    eventId = ((await created.json()) as { id: string }).id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("needs an organizer session", async () => {
    expect((await send(null, "GET", termsPath())).status).toBe(401)
    const participant = await signIn("ucastnik@example.com", "password4")
    expect((await send(participant, "GET", termsPath())).status).toBe(403)
  })

  it("adds terms and lists them sorted by start date", async () => {
    const august = await send(cookieA, "POST", termsPath(), {
      name: "Srpnový turnus",
      startsOn: "2027-08-02",
      endsOn: "2027-08-08",
      priceCzk: 7400,
    })
    expect(august.status).toBe(201)
    await send(cookieA, "POST", termsPath(), {
      name: "Letní turnus 1",
      startsOn: "2027-07-12",
      endsOn: "2027-07-18",
      priceCzk: 6900,
    })

    const terms = await list()
    expect(terms.map((term) => term.name)).toEqual(["Letní turnus 1", "Srpnový turnus"])
    expect(terms[0]).toMatchObject({ priceCzk: 6900, capacity: 0, confirmedCount: 0 })
  })

  it("rejects an end before the start", async () => {
    const response = await send(cookieA, "POST", termsPath(), {
      name: "Špatně",
      startsOn: "2027-08-09",
      endsOn: "2027-08-08",
      priceCzk: 100,
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: "TERM_END_BEFORE_START" })
  })

  it("rejects a missing name and a negative price", async () => {
    const base = { startsOn: "2027-08-01", endsOn: "2027-08-02" }
    expect((await send(cookieA, "POST", termsPath(), { ...base, priceCzk: 1 })).status).toBe(400)
    const negative = await send(cookieA, "POST", termsPath(), { ...base, name: "X", priceCzk: -1 })
    expect(negative.status).toBe(400)
  })

  it("edits a term", async () => {
    const [first] = await list()
    const response = await send(cookieA, "PATCH", `${termsPath()}/${first.id}`, {
      name: "Letní turnus 1b",
      startsOn: "2027-07-13",
      endsOn: "2027-07-19",
      priceCzk: 7000,
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      name: "Letní turnus 1b",
      startsOn: "2027-07-13",
      priceCzk: 7000,
    })
  })

  it("counts beds of the rooms as capacity", async () => {
    const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } })
    await prisma.room.create({
      data: {
        organizationId: event.organizationId,
        eventId,
        name: "A",
        capacity: 6,
        gender: "FEMALE",
      },
    })
    await prisma.room.create({
      data: {
        organizationId: event.organizationId,
        eventId,
        name: "B",
        capacity: 4,
        gender: "MALE",
      },
    })
    expect((await list())[0].capacity).toBe(10)
  })

  it("cancels a term, keeps it listed last and out of the public form", async () => {
    const [first, second] = await list()
    const response = await send(cookieA, "POST", `${termsPath()}/${first.id}/cancel`, {
      reason: "Areál není k dispozici",
    })
    expect(response.status).toBe(201)

    const terms = await list()
    expect(terms.map((term) => term.id)).toEqual([second.id, first.id])
    expect(terms[1]).toMatchObject({ cancelReason: "Areál není k dispozici" })
    expect(terms[1].cancelledAt).not.toBeNull()

    const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } })
    const overview = await send(cookieA, "GET", `/organizer/events/${eventId}`)
    expect(await overview.json()).toMatchObject({ termCount: 1 })
    const publicPage = (await (await fetch(api(`/public/events/${event.publicToken}`))).json()) as {
      terms: { id: string }[]
    }
    expect(publicPage.terms.map((term) => term.id)).toEqual([second.id])
  })

  it("does not edit or cancel a cancelled term again", async () => {
    const cancelled = (await list()).find((term) => term.cancelledAt)!
    const body = { name: "X", startsOn: "2027-08-01", endsOn: "2027-08-02", priceCzk: 1 }
    const edit = await send(cookieA, "PATCH", `${termsPath()}/${cancelled.id}`, body)
    expect(edit.status).toBe(409)
    expect(await edit.json()).toMatchObject({ code: "TERM_CANCELLED" })
    const again = await send(cookieA, "POST", `${termsPath()}/${cancelled.id}/cancel`, {
      reason: "x",
    })
    expect(again.status).toBe(409)
  })

  it("requires a cancellation reason", async () => {
    const [active] = await list()
    const response = await send(cookieA, "POST", `${termsPath()}/${active.id}/cancel`, {})
    expect(response.status).toBe(400)
  })

  it("keeps organizations apart", async () => {
    const [term] = await list()
    const body = { name: "Cizí", startsOn: "2027-08-01", endsOn: "2027-08-02", priceCzk: 1 }
    expect((await send(cookieB, "GET", termsPath())).status).toBe(403)
    expect((await send(cookieB, "POST", termsPath(), body)).status).toBe(403)
    expect((await send(cookieB, "PATCH", `${termsPath()}/${term.id}`, body)).status).toBe(403)
    expect(
      (await send(cookieB, "POST", `${termsPath()}/${term.id}/cancel`, { reason: "x" })).status,
    ).toBe(403)
  })

  it("answers 403 for a term of another event of the same organization", async () => {
    const other = (await (
      await send(cookieA, "POST", "/organizer/events", { name: "Druhá" })
    ).json()) as {
      id: string
    }
    const [term] = await list()
    const body = { name: "X", startsOn: "2027-08-01", endsOn: "2027-08-02", priceCzk: 1 }
    const response = await send(cookieA, "PATCH", `${termsPath(other.id)}/${term.id}`, body)
    expect(response.status).toBe(403)
  })
})
