// Staging/demo bypass of the e-mail verification link. The shared test server runs with
// EMAIL_VERIFICATION_BYPASS_ENABLED=true; the "off" case starts its own server with it off.
import { ChildProcess, spawn } from "node:child_process"
import { createServer } from "node:net"
import { resolve } from "node:path"
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed } from "@/test/integration/test-api"

const backendRoot = resolve(__dirname, "../../../..")
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3050"
const headers = { "Content-Type": "application/json", Origin: frontendUrl }

const post = (base: string, path: string, body: unknown, cookie?: string): Promise<Response> =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  })

const signUp = (base: string, email: string): Promise<Response> =>
  post(base, "/auth/sign-up/email", { email, password: "password123", name: email })

describe("e-mail verification bypass (integration)", () => {
  let prisma: PrismaService
  const shared = api("")

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("verifies a fresh organizer account, signs it in and lets it create an organization", async () => {
    const email = "bypass-organizer@example.com"
    await signUp(shared, email)
    expect((await fetch(`${shared}/auth/email-verification-bypass/status`)).status).toBe(200)

    const response = await post(shared, "/auth/email-verification-bypass", {
      email,
      password: "password123",
    })
    expect(response.status).toBe(200)
    const cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ")
    expect(cookie).toBeTruthy()
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).emailVerified).toBe(true)

    const create = await post(shared, "/organizer/organizations", { name: "Bypass Events" }, cookie)
    expect(create.status).toBe(201)
  })

  it("refuses a caller that does not know the password and leaves the account unverified", async () => {
    const email = "bypass-wrong-password@example.com"
    await signUp(shared, email)

    const wrong = await post(shared, "/auth/email-verification-bypass", {
      email,
      password: "not-the-password",
    })
    expect(wrong.status).toBe(403)
    expect(await wrong.json()).toMatchObject({ code: "EMAIL_VERIFICATION_BYPASS_NOT_ALLOWED" })
    expect(wrong.headers.getSetCookie()).toHaveLength(0)
    const missing = await post(shared, "/auth/email-verification-bypass", { email })
    expect(missing.status).toBe(403)
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).emailVerified).toBe(false)
  })

  it("refuses accounts that are already verified, older than the link or not organizers", async () => {
    const verified = await post(shared, "/auth/email-verification-bypass", {
      email: "organizator@example.com",
      password: "password1",
    })
    expect(verified.status).toBe(403)
    expect(await verified.json()).toMatchObject({ code: "EMAIL_VERIFICATION_BYPASS_NOT_ALLOWED" })

    const old = "bypass-old@example.com"
    await signUp(shared, old)
    await prisma.user.update({
      where: { email: old },
      data: { createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    })
    expect(
      (
        await post(shared, "/auth/email-verification-bypass", {
          email: old,
          password: "password123",
        })
      ).status,
    ).toBe(403)
    expect((await prisma.user.findUniqueOrThrow({ where: { email: old } })).emailVerified).toBe(
      false,
    )

    const unknown = await post(shared, "/auth/email-verification-bypass", {
      email: "nobody@example.com",
      password: "password123",
    })
    expect(unknown.status).toBe(403)
  })

  describe("with the flag off", () => {
    let server: ChildProcess
    let off: string

    beforeAll(async () => {
      const port = await freePort()
      off = `http://127.0.0.1:${port}/api`
      server = spawn("node", ["dist/main.js"], {
        cwd: backendRoot,
        env: {
          ...process.env,
          PORT: String(port),
          BACKEND_URL: `http://127.0.0.1:${port}`,
          NODE_ENV: "test",
          RESEND_API_KEY: "",
          SMTP_HOST: "",
          RATE_LIMIT_ENABLED: "false",
          WAITLIST_EXPIRY_INTERVAL_MS: "0",
          EMAIL_VERIFICATION_BYPASS_ENABLED: "false",
        },
        stdio: "ignore",
      })
      await waitForHealth(off)
    }, 40_000)

    afterAll(() => {
      server?.kill()
    })

    it("reports the bypass as off and leaves the account unverified", async () => {
      const email = "bypass-off@example.com"
      await signUp(off, email)

      expect(await (await fetch(`${off}/auth/email-verification-bypass/status`)).json()).toEqual({
        enabled: false,
      })
      const response = await post(off, "/auth/email-verification-bypass", {
        email,
        password: "password123",
      })
      expect(response.status).toBe(404)
      expect(await response.json()).toMatchObject({ code: "EMAIL_VERIFICATION_BYPASS_DISABLED" })
      expect(response.headers.getSetCookie()).toHaveLength(0)
      expect((await prisma.user.findUniqueOrThrow({ where: { email } })).emailVerified).toBe(false)
    })
  })
})

function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const probe = createServer()
    probe.once("error", reject)
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address()
      probe.close(() =>
        typeof address === "object" && address
          ? resolvePort(address.port)
          : reject(new Error("No free port")),
      )
    })
  })
}

async function waitForHealth(base: string): Promise<void> {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${base}/health`)).ok) return
    } catch {
      // not listening yet
    }
    await new Promise((wait) => setTimeout(wait, 250))
  }
  throw new Error("Test server did not start")
}
