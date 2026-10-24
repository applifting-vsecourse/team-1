import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

describe("application list API", () => {
  let prisma: PrismaService
  let cookie: string
  let eventId: string
  const get = (query = "", session = cookie, id = eventId): Promise<Response> =>
    fetch(api(`/organizer/events/${id}/applications${query}`), { headers: { Cookie: session } })
  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    eventId = (
      await prisma.event.findUniqueOrThrow({ where: { publicToken: "demo-letni-kemp-2027" } })
    ).id
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("returns personal details, frozen prices and stable newest-first ordering", async () => {
    const response = await get()
    expect(response.status).toBe(200)
    const rows = await response.json()
    const source = await prisma.application.findMany({
      where: { eventId },
      orderBy: [{ submittedAt: "desc" }, { number: "desc" }],
    })
    expect(rows.map((row: { id: string }) => row.id)).toEqual(source.map((row) => row.id))
    expect(rows[0]).toMatchObject({
      firstName: source[0].firstName,
      lastName: source[0].lastName,
      birthDate: source[0].birthDate.toISOString().slice(0, 10),
      email: source[0].email,
      gender: source[0].gender,
    })
    expect(rows[0].terms.length).toBeGreaterThan(0)
    expect(rows[0].amountOwedCzk).toBe(rows[0].amountDueCzk - rows[0].amountPaidCzk)
  })

  it("combines term, status, gender and payment without losing other terms", async () => {
    const source = await prisma.application.findFirstOrThrow({
      where: { eventId, terms: { some: { status: "CONFIRMED" } } },
      include: { terms: true },
    })
    const term = source.terms.find((term) => term.status === "CONFIRMED")!
    const rows = await (
      await get(`?termId=${term.termId}&status=CONFIRMED&gender=${source.gender}&paid=false`)
    ).json()
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.gender).toBe(source.gender)
      expect(row.amountOwedCzk).toBeGreaterThan(0)
      expect(row.terms).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: term.termId, status: "CONFIRMED" })]),
      )
    }
    expect(await (await get("?termId=missing")).json()).toEqual([])
  })

  it("validates filters and protects organization data", async () => {
    for (const query of ["?paid=maybe", "?status=OTHER", "?gender=OTHER"])
      expect((await get(query)).status).toBe(400)
    expect((await get("", "")).status).toBe(401)
    expect((await get("", await signIn("ucastnik@example.com", "password4"))).status).toBe(403)
    const foreign = await prisma.event.findUniqueOrThrow({
      where: { publicToken: "demo-horsky-vikend-2027" },
    })
    const response = await get("", cookie, foreign.id)
    expect(response.status).toBe(403)
    expect(await response.text()).not.toContain(foreign.name)
    expect((await get("", cookie, "missing")).status).toBe(403)
  })
})
