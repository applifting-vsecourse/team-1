import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

describe("last opened event API (US-51)", () => {
  let prisma: PrismaService
  let cookie: string
  let eventId: string
  const lastOpened = async (session = cookie) =>
    (
      await (
        await fetch(api("/organizer/last-opened-event"), { headers: { Cookie: session } })
      ).json()
    ).eventId
  const open = (id: string, session = cookie) =>
    fetch(api(`/organizer/events/${id}/last-opened`), {
      method: "PUT",
      headers: { Cookie: session },
    })

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

  it("has none until an event is opened, then returns the last one", async () => {
    expect(await lastOpened()).toBeNull()
    expect((await open(eventId)).status).toBe(204)
    expect(await lastOpened()).toBe(eventId)
    const other = await prisma.event.findFirstOrThrow({
      where: {
        id: { not: eventId },
        organization: { members: { some: { user: { email: "organizator@example.com" } } } },
      },
    })
    expect((await open(other.id)).status).toBe(204)
    expect(await lastOpened()).toBe(other.id)
  })

  it("is not remembered for a foreign or missing event, and is for organizers only", async () => {
    expect((await open("does-not-exist")).status).toBe(403)
    const foreign = await prisma.event.findFirstOrThrow({
      where: {
        organization: { members: { none: { user: { email: "organizator@example.com" } } } },
      },
    })
    expect((await open(foreign.id)).status).toBe(403)
    expect((await open(eventId, "")).status).toBe(401)
    expect((await open(eventId, await signIn("ucastnik@example.com", "password4"))).status).toBe(
      403,
    )
  })
})
