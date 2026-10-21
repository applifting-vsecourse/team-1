// US-04: a participant who entered by magic link chooses their own password.
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

const frontend = process.env.FRONTEND_URL ?? "http://localhost:3050"
const json = { "Content-Type": "application/json", Origin: frontend }

describe("participant password (integration)", () => {
  let prisma: PrismaService

  /** A participant without a password who has just entered by magic link: returns the Cookie header. */
  const enterByMagicLink = async (email: string): Promise<string> => {
    await prisma.user.create({
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
    await fetch(api("/auth/sign-in/magic-link"), {
      method: "POST",
      headers: json,
      body: JSON.stringify({ email }),
    })
    const { identifier } = await prisma.verification.findFirstOrThrow({
      orderBy: { createdAt: "desc" },
    })
    const url = new URL(api("/auth/magic-link/verify"))
    url.searchParams.set("token", identifier)
    url.searchParams.set("callbackURL", `${frontend}/participant/set-password`)
    const response = await fetch(url, { redirect: "manual", headers: { Origin: frontend } })
    return response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ")
  }

  const setPassword = (cookie: string | undefined, password: unknown): Promise<Response> =>
    fetch(api("/participant/password"), {
      method: "POST",
      headers: { ...json, ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify({ password }),
    })

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("sets the password, keeps the session and lets the participant sign in with it", async () => {
    const email = "nova@example.com"
    const cookie = await enterByMagicLink(email)

    const response = await setPassword(cookie, "my-own-password")

    expect(response.status).toBe(204)
    const me = await fetch(api("/me"), { headers: { Cookie: cookie } })
    expect(await me.json()).toMatchObject({ email, mustSetPassword: false })
    expect(await signIn(email, "my-own-password")).toContain("session_token")
  })

  it("refuses a password shorter than 8 characters and changes nothing", async () => {
    const email = "kratke@example.com"
    const cookie = await enterByMagicLink(email)

    const response = await setPassword(cookie, "1234567")

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: "VALIDATION_FAILED" })
    const user = await prisma.user.findUniqueOrThrow({ where: { email } })
    expect(user.mustSetPassword).toBe(true)
  })

  it("refuses a participant who already has a password", async () => {
    const response = await setPassword(
      await signIn("ucastnik@example.com", "password4"),
      "another-password",
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: "PASSWORD_ALREADY_SET" })
  })

  it("answers 401 without a session", async () => {
    expect((await setPassword(undefined, "my-own-password")).status).toBe(401)
  })

  it("answers 403 to an organizer", async () => {
    const cookie = await signIn("organizator@example.com", "password1")

    expect((await setPassword(cookie, "my-own-password")).status).toBe(403)
  })
})
