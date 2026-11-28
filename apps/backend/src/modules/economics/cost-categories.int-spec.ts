import { readdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

const CZECH = ["Prostory", "Doprava", "Strava", "Lidé", "Materiál a program", "Ostatní"]
const ENGLISH = ["Venue", "Transport", "Food", "Staff", "Program & Entertainment", "Other"]

type Category = { id: string; defaultKey: string | null; name: string; position: number }

const list = (eventId: string, cookie?: string, language = "cs"): Promise<Response> =>
  fetch(api(`/organizer/events/${eventId}/cost-categories`), {
    headers: { "Accept-Language": language, ...(cookie ? { Cookie: cookie } : {}) },
  })

const categoriesOf = async (
  eventId: string,
  cookie: string,
  language?: string,
): Promise<Category[]> => {
  const response = await list(eventId, cookie, language)
  expect(response.status).toBe(200)
  return (await response.json()) as Category[]
}

describe("cost categories (integration)", () => {
  let prisma: PrismaService
  let olga: string
  let ondrej: string

  const eventsOf = (email: string): Promise<{ id: string }[]> =>
    prisma.event.findMany({
      where: { organization: { members: { some: { user: { email } } } } },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    })

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    olga = await signIn("organizator@example.com", "password1")
    ondrej = await signIn("organizator2@example.com", "password2")
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("returns the organization's categories in order, the same for all its events", async () => {
    const [first, second] = await eventsOf("organizator@example.com")

    const categories = await categoriesOf(first.id, olga)
    expect(categories.map((category) => category.name)).toEqual(CZECH)
    expect(categories.map((category) => category.position)).toEqual([0, 1, 2, 3, 4, 5])
    expect((await categoriesOf(first.id, olga, "en")).map((category) => category.name)).toEqual(
      ENGLISH,
    )
    expect(await categoriesOf(second.id, olga)).toEqual(categories)
  })

  // N11 will add these; the model takes any number of them next to the defaults.
  it("lists categories of the organization's own after the defaults, as written", async () => {
    const [event] = await eventsOf("organizator@example.com")
    const { organizationId } = await prisma.event.findUniqueOrThrow({ where: { id: event.id } })
    await prisma.costCategory.createMany({
      data: [
        { organizationId, name: "Pojištění", position: 6 },
        { organizationId, name: "Dárky", position: 7 },
      ],
    })

    const categories = await categoriesOf(event.id, olga, "en")
    expect(categories.map((category) => category.name)).toEqual([...ENGLISH, "Pojištění", "Dárky"])
  })

  it("does not show them to another organization", async () => {
    const [olgas] = await eventsOf("organizator@example.com")
    const [ondrejs] = await eventsOf("organizator2@example.com")

    for (const eventId of [olgas.id, "unknown-event"]) {
      const response = await list(eventId, ondrej)
      expect(response.status).toBe(403)
      expect(await response.text()).not.toContain("Prostory")
    }
    const own = (await categoriesOf(ondrejs.id, ondrej)).map((category) => category.id)
    const foreign = (await categoriesOf(olgas.id, olga)).map((category) => category.id)
    expect(own).toHaveLength(6)
    expect(foreign.filter((id) => own.includes(id))).toEqual([])

    expect((await list(olgas.id)).status).toBe(401)
    const participant = await signIn("ucastnik@example.com", "password4")
    expect((await list(olgas.id, participant)).status).toBe(403)
  })

  it("backfills organizations that existed before the migration", async () => {
    const migrations = resolve(__dirname, "../../../prisma/migrations")
    const folder = readdirSync(migrations).find((name) => name.endsWith("_cost_categories"))!
    const sql = readFileSync(join(migrations, folder, "migration.sql"), "utf8")
    await prisma.costCategory.deleteMany()

    await prisma.$executeRawUnsafe(sql.slice(sql.indexOf('INSERT INTO "cost_category"')))

    const organizations = await prisma.organization.count()
    expect(await prisma.costCategory.count()).toBe(organizations * 6)
    const [event] = await eventsOf("organizator@example.com")
    expect((await categoriesOf(event.id, olga)).map((category) => category.name)).toEqual(CZECH)
  })

  it("gives them to a newly created organization", async () => {
    // An organizer without an organization, as right after sign-up.
    await prisma.organizationMember.deleteMany({
      where: { user: { email: "organizator2@example.com" } },
    })
    const send = (method: string, path: string, body: unknown): Promise<Response> =>
      fetch(api(path), {
        method,
        headers: {
          "Content-Type": "application/json",
          Origin: process.env.FRONTEND_URL ?? "http://localhost:3050",
          Cookie: ondrej,
        },
        body: JSON.stringify(body),
      })

    const created = await send("POST", "/organizer/organizations", { name: "Nový spolek" })
    expect(created.status).toBe(201)
    const { id } = (await created.json()) as { id: string }
    const profile = await send("PUT", `/organizer/organizations/${id}/profile`, {
      contactEmail: "info@novy-spolek.example",
      bankAccount: "2900123456/2010",
    })
    expect(profile.status).toBe(200)
    const event = await send("POST", "/organizer/events", { name: "První akce" })
    expect(event.status).toBe(201)

    const categories = await categoriesOf(((await event.json()) as { id: string }).id, ondrej)
    expect(categories.map((category) => category.name)).toEqual(CZECH)
  })
})
