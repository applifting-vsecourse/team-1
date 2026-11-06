import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

describe("payment overview API", () => {
  let prisma: PrismaService
  let cookie: string
  let eventId: string
  const get = (session = cookie, id = eventId) =>
    fetch(api(`/organizer/events/${id}/payments`), { headers: { Cookie: session } })

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    eventId = (
      await prisma.event.findUniqueOrThrow({
        where: { publicToken: "demo-letni-kemp-2027" },
      })
    ).id
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("shows term debts and dates with an unfiltered total", async () => {
    const response = await get()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.entries.length).toBeGreaterThan(0)
    expect(
      body.entries.every(
        (entry: { reminderCount: number; lastReminderAt: string | null }) =>
          entry.reminderCount === 0 && entry.lastReminderAt === null,
      ),
    ).toBe(true)
    expect(body.entries[0].paymentDueAt).toBeTruthy()
    expect(body.entries[0].startsOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(body.entries[0].endsOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(body.totalDebtCzk).toBe(
      body.entries.reduce(
        (sum: number, entry: { amountOwedCzk: number }) => sum + Math.max(0, entry.amountOwedCzk),
        0,
      ),
    )
    expect(body.debtorCount).toBeGreaterThan(0)
  })

  it("requires an organizer with access to the event", async () => {
    expect((await get("")).status).toBe(401)
    expect((await get(await signIn("ucastnik@example.com", "password4"))).status).toBe(403)
    const foreign = await prisma.event.findUniqueOrThrow({
      where: { publicToken: "demo-horsky-vikend-2027" },
    })
    const response = await get(cookie, foreign.id)
    expect(response.status).toBe(403)
    expect(await response.text()).not.toContain(foreign.name)
  })
})
