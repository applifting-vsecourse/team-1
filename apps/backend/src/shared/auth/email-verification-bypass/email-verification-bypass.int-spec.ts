// Staging/demo bypass of the e-mail verification link. The shared test server runs with
// EMAIL_VERIFICATION_BYPASS_ENABLED=true; the "off" case starts its own server without the
// variable, which is how a deployment that does not opt in runs.
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

/** Registers an organizer and returns the one-time token the sign-up response carries. */
async function register(base: string, email: string): Promise<string | undefined> {
  const response = await post(base, "/auth/sign-up/email", {
    email,
    password: "password123",
    name: email,
  })
  expect(response.status).toBe(200)
  const body = (await response.json()) as { emailVerificationBypassToken?: string }
  return body.emailVerificationBypassToken
}

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

  it("verifies the registered account with its token, signs it in and lets it create an organization", async () => {
    const email = "bypass-organizer@example.com"
    const token = await register(shared, email)
    expect(token).toBeTruthy()
    expect(await (await fetch(`${shared}/email-verification-bypass/status`)).json()).toEqual({
      enabled: true,
    })

    const response = await post(shared, "/email-verification-bypass", { token })
    expect(response.status).toBe(204)
    const cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ")
    expect(cookie).toBeTruthy()
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).emailVerified).toBe(true)

    const create = await post(shared, "/organizer/organizations", { name: "Bypass Events" }, cookie)
    expect(create.status).toBe(201)
  })

  it("accepts a token only once", async () => {
    const token = await register(shared, "bypass-replay@example.com")
    expect((await post(shared, "/email-verification-bypass", { token })).status).toBe(204)

    const replay = await post(shared, "/email-verification-bypass", { token })
    expect(replay.status).toBe(403)
    expect(await replay.json()).toMatchObject({ code: "EMAIL_VERIFICATION_BYPASS_NOT_ALLOWED" })
    expect(replay.headers.getSetCookie()).toHaveLength(0)
  })

  it("refuses an unknown, an expired and a missing token and leaves accounts unverified", async () => {
    const email = "bypass-expired@example.com"
    const token = await register(shared, email)
    await prisma.verification.updateMany({
      where: {
        identifier: { startsWith: "email-verification-bypass:" },
        value: await userId(email),
      },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })

    for (const attempt of [token, "not-a-token"]) {
      const refused = await post(shared, "/email-verification-bypass", { token: attempt })
      expect(refused.status).toBe(403)
      expect(await refused.json()).toMatchObject({ code: "EMAIL_VERIFICATION_BYPASS_NOT_ALLOWED" })
      expect(refused.headers.getSetCookie()).toHaveLength(0)
    }
    expect((await post(shared, "/email-verification-bypass", {})).status).toBe(400)
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).emailVerified).toBe(false)
  })

  it("is not reachable through BetterAuth's own routes", async () => {
    const token = await register(shared, "bypass-direct@example.com")
    expect((await post(shared, "/auth/email-verification-bypass", { token })).status).toBe(404)
  })

  describe("when the deployment does not switch it on", () => {
    let server: ChildProcess
    let off: string

    beforeAll(async () => {
      const port = await freePort()
      off = `http://127.0.0.1:${port}/api`
      const env = { ...process.env }
      delete env.EMAIL_VERIFICATION_BYPASS_ENABLED
      server = spawn("node", ["dist/main.js"], {
        cwd: backendRoot,
        env: {
          ...env,
          PORT: String(port),
          BACKEND_URL: `http://127.0.0.1:${port}`,
          NODE_ENV: "test",
          RESEND_API_KEY: "",
          SMTP_HOST: "",
          RATE_LIMIT_ENABLED: "false",
          WAITLIST_EXPIRY_INTERVAL_MS: "0",
        },
        stdio: "ignore",
      })
      await waitForHealth(off)
    }, 40_000)

    afterAll(() => {
      server?.kill()
    })

    it("hands out no token, reports it off and refuses the endpoint", async () => {
      const email = "bypass-off@example.com"
      expect(await register(off, email)).toBeUndefined()
      expect(await (await fetch(`${off}/email-verification-bypass/status`)).json()).toEqual({
        enabled: false,
      })

      const response = await post(off, "/email-verification-bypass", { token: "anything" })
      expect(response.status).toBe(404)
      expect(await response.json()).toMatchObject({ code: "EMAIL_VERIFICATION_BYPASS_DISABLED" })
      expect(response.headers.getSetCookie()).toHaveLength(0)
      expect((await prisma.user.findUniqueOrThrow({ where: { email } })).emailVerified).toBe(false)
    })
  })

  async function userId(email: string): Promise<string> {
    return (await prisma.user.findUniqueOrThrow({ where: { email } })).id
  }
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
