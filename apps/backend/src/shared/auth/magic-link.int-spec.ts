// US-01: the participant's one-time sign-in link — issued only to participant
// accounts, valid 7 days, usable once, never creating an account.
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed } from "@/test/integration/test-api"

const frontend = process.env.FRONTEND_URL ?? "http://localhost:3050"
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

async function requestLink(email: string): Promise<Response> {
  return fetch(api("/auth/sign-in/magic-link"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: frontend },
    body: JSON.stringify({ email }),
  })
}

async function verifyLink(token: string): Promise<Response> {
  const url = new URL(api("/auth/magic-link/verify"))
  url.searchParams.set("token", token)
  url.searchParams.set("callbackURL", `${frontend}/participant/set-password`)
  url.searchParams.set("errorCallbackURL", `${frontend}/participant/magic-link`)
  return fetch(url, { redirect: "manual", headers: { Origin: frontend } })
}

describe("magic link (integration)", () => {
  let prisma: PrismaService

  const createParticipant = (email: string): Promise<unknown> =>
    prisma.user.create({
      data: {
        id: `user-${email}`,
        name: "Petra Nováková",
        email,
        emailVerified: true,
        accountType: "PARTICIPANT",
        mustSetPassword: true,
        locale: "cs",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

  /** The newest token in the database (stored plain). */
  const latestToken = async (): Promise<string> => {
    const row = await prisma.verification.findFirstOrThrow({
      orderBy: { createdAt: "desc" },
    })
    return row.identifier
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    await createParticipant("petra@example.com")
  })

  beforeEach(async () => {
    await prisma.verification.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("issues a link valid for 7 days to a participant", async () => {
    const response = await requestLink("petra@example.com")

    expect(response.status).toBe(200)
    const rows = await prisma.verification.findMany()
    expect(rows).toHaveLength(1)
    const lifetime = rows[0].expiresAt.getTime() - Date.now()
    expect(lifetime).toBeGreaterThan(SEVEN_DAYS_MS - 60_000)
    expect(lifetime).toBeLessThanOrEqual(SEVEN_DAYS_MS)
  })

  it("signs the participant in and leaves them to choose a password", async () => {
    await requestLink("petra@example.com")

    const response = await verifyLink(await latestToken())

    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toBe(`${frontend}/participant/set-password`)
    const cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ")
    const me = await fetch(api("/me"), { headers: { Cookie: cookie } })
    expect(await me.json()).toMatchObject({
      email: "petra@example.com",
      accountType: "PARTICIPANT",
      mustSetPassword: true,
    })
  })

  it("works only once", async () => {
    await requestLink("petra@example.com")
    const token = await latestToken()
    await verifyLink(token)

    const second = await verifyLink(token)

    expect(second.status).toBe(302)
    expect(second.headers.get("location")).toContain(
      `${frontend}/participant/magic-link?error=INVALID_TOKEN`,
    )
    expect(second.headers.getSetCookie()).toHaveLength(0)
  })

  it("stops working after it expires", async () => {
    await requestLink("petra@example.com")
    const token = await latestToken()
    await prisma.verification.updateMany({
      where: { identifier: token },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })

    const response = await verifyLink(token)

    expect(response.headers.get("location")).toContain("error=INVALID_TOKEN")
    expect(response.headers.getSetCookie()).toHaveLength(0)
  })

  it("answers an unknown e-mail the same way and creates nothing", async () => {
    const usersBefore = await prisma.user.count()

    const response = await requestLink("nobody@example.com")

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: true })
    expect(await prisma.user.count()).toBe(usersBefore)
    expect(await prisma.verification.count()).toBe(0)
  })

  it("gives an organizer no link, with the same answer", async () => {
    const response = await requestLink("organizator@example.com")

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: true })
    expect(await prisma.verification.count()).toBe(0)
  })

  it("gives the admin no link either", async () => {
    const response = await requestLink("admin@example.com")

    expect(response.status).toBe(200)
    expect(await prisma.verification.count()).toBe(0)
  })
})
