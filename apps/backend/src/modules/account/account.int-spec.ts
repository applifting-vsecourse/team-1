// Example HTTP integration test — the pattern to copy: the built server and a
// real database, requests over HTTP with a BetterAuth session cookie.
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

describe("accounts (integration)", () => {
  let prisma: PrismaService

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("answers /api/me without a session with 401 and a code to translate", async () => {
    const response = await fetch(api("/me"))

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({
      statusCode: 401,
      code: "UNAUTHORIZED",
    })
  })

  it("rejects a wrong password", async () => {
    await expect(signIn("organizator@example.com", "wrong-password")).rejects.toThrow()
  })

  it("returns an organizer with all their organizations", async () => {
    const cookie = await signIn("organizator3@example.com", "password3")

    const response = await fetch(api("/me"), { headers: { Cookie: cookie } })

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      accountType: string
      organizations: unknown[]
    }
    expect(body.accountType).toBe("ORGANIZER")
    expect(body.organizations).toHaveLength(2)
  })

  it("returns a participant without organizations", async () => {
    const cookie = await signIn("ucastnik@example.com", "password4")

    const response = await fetch(api("/me"), { headers: { Cookie: cookie } })

    expect(await response.json()).toMatchObject({
      accountType: "PARTICIPANT",
      mustSetPassword: false,
      locale: "cs",
      organizations: [],
    })
  })

  describe("profile and password (US-124)", () => {
    const frontend = process.env.FRONTEND_URL ?? "http://localhost:3050"
    const json = { "Content-Type": "application/json", Origin: frontend }
    const patchMe = (cookie: string | undefined, body: unknown): Promise<Response> =>
      fetch(api("/me"), {
        method: "PATCH",
        headers: { ...json, ...(cookie ? { Cookie: cookie } : {}) },
        body: JSON.stringify(body),
      })

    it("refuses a profile change without a session", async () => {
      const response = await patchMe(undefined, { name: "Eva", locale: "cs" })

      expect(response.status).toBe(401)
    })

    it("saves name and preferred language, which then travel with the account", async () => {
      const cookie = await signIn("ucastnik@example.com", "password4")

      const response = await patchMe(cookie, { name: "  Eva Malá  ", locale: "cs" })

      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ name: "Eva Malá", locale: "cs" })
      const stored = await prisma.user.findUniqueOrThrow({
        where: { email: "ucastnik@example.com" },
      })
      expect(stored).toMatchObject({ name: "Eva Malá", locale: "cs" })
      const me = (await (await fetch(api("/me"), { headers: { Cookie: cookie } })).json()) as {
        locale: string
      }
      expect(me.locale).toBe("cs")

      await patchMe(cookie, { name: "Eva Malá", locale: "en" })
      const switched = await prisma.user.findUniqueOrThrow({
        where: { email: "ucastnik@example.com" },
      })
      expect(switched.locale).toBe("en")
    })

    it.each([
      { name: "", locale: "cs" },
      { name: "   ", locale: "cs" },
      { name: "Eva", locale: "de" },
      { name: "Eva" },
      { name: "Eva", locale: "cs", accountType: "ORGANIZER" },
    ])("rejects an invalid profile %j", async (body) => {
      const cookie = await signIn("ucastnik@example.com", "password4")

      const response = await patchMe(cookie, body)

      expect(response.status).toBe(400)
      expect(
        await prisma.user.count({
          where: { email: "ucastnik@example.com", accountType: "PARTICIPANT" },
        }),
      ).toBe(1)
    })

    const changePassword = (cookie: string, currentPassword: string, newPassword: string) =>
      fetch(api("/auth/change-password"), {
        method: "POST",
        headers: { ...json, Cookie: cookie },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

    it("changes the password through BetterAuth: old one stops working, new one signs in", async () => {
      const cookie = await signIn("organizator2@example.com", "password2")

      const response = await changePassword(cookie, "password2", "brand-new-password")

      expect(response.status).toBe(200)
      await expect(signIn("organizator2@example.com", "password2")).rejects.toThrow()
      await expect(signIn("organizator2@example.com", "brand-new-password")).resolves.toBeTruthy()
    })

    it("refuses a wrong current password and keeps the old one", async () => {
      const cookie = await signIn("organizator3@example.com", "password3")

      const response = await changePassword(cookie, "not-my-password", "brand-new-password")

      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ code: "INVALID_PASSWORD" })
      await expect(signIn("organizator3@example.com", "password3")).resolves.toBeTruthy()
    })

    it("refuses a new password shorter than 8 characters", async () => {
      const cookie = await signIn("organizator3@example.com", "password3")

      const response = await changePassword(cookie, "password3", "short")

      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ code: "PASSWORD_TOO_SHORT" })
      await expect(signIn("organizator3@example.com", "password3")).resolves.toBeTruthy()
    })
  })
})
