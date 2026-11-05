// #294: limits of the public application and of sign-in, counted per client IP
// behind our proxy. The shared test server runs without limits (all tests send
// from 127.0.0.1), so this file starts its own built server with them on.
// Requests come from loopback, a trusted proxy, so `X-Forwarded-For` stands in
// for the client address the way Traefik sets it on staging.
import { ChildProcess, spawn } from "node:child_process"
import { createServer } from "node:net"
import { resolve } from "node:path"

const backendRoot = resolve(__dirname, "../../..")
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3050"

let server: ChildProcess
let baseUrl: string

beforeAll(async () => {
  const port = await freePort()
  baseUrl = `http://127.0.0.1:${port}`
  server = spawn("node", ["dist/main.js"], {
    cwd: backendRoot,
    env: {
      ...process.env,
      PORT: String(port),
      BACKEND_URL: baseUrl,
      NODE_ENV: "test",
      RESEND_API_KEY: "",
      SMTP_HOST: "",
      RATE_LIMIT_ENABLED: "true",
      WAITLIST_EXPIRY_INTERVAL_MS: "0",
    },
    stdio: "ignore",
  })
  await waitForHealth()
}, 40_000)

afterAll(() => {
  server?.kill()
})

const post = (path: string, client: string, body: unknown = {}): Promise<Response> =>
  fetch(`${baseUrl}/api${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: frontendUrl,
      "X-Forwarded-For": client,
    },
    body: JSON.stringify(body),
  })

/** Sends `count` requests one after another and returns their statuses. */
async function statuses(count: number, send: () => Promise<Response>): Promise<number[]> {
  const result: number[] = []
  for (let i = 0; i < count; i++) result.push((await send()).status)
  return result
}

describe("rate limits (integration)", () => {
  const apply = (client: string): Promise<Response> =>
    post("/public/events/no-such-link/applications", client)

  it("let 20 applications a minute from one address through, refuse the 21st with TOO_MANY_REQUESTS", async () => {
    const first = await statuses(20, () => apply("203.0.113.10"))
    const over = await apply("203.0.113.10")

    expect(first).not.toContain(429)
    expect(over.status).toBe(429)
    expect(await over.json()).toEqual({
      statusCode: 429,
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests",
    })
  })

  it("count the client behind the proxy, not the proxy: another address still applies", async () => {
    await statuses(21, () => apply("203.0.113.20"))

    expect((await apply("203.0.113.21")).status).not.toBe(429)
  })

  it("ignore an address the client writes into X-Forwarded-For itself", async () => {
    await statuses(21, () => apply("203.0.113.30"))

    // Traefik appends the real client; whatever the client sent stays on the left.
    expect((await apply("198.51.100.7, 203.0.113.30")).status).toBe(429)
  })

  it("allow 5 password sign-ins a minute, then answer 429", async () => {
    const signIn = (): Promise<Response> =>
      post("/auth/sign-in/email", "203.0.113.40", {
        email: "nobody@example.com",
        password: "wrong-password",
      })

    const first = await statuses(5, signIn)
    const over = await signIn()

    expect(first).toEqual([401, 401, 401, 401, 401])
    expect(over.status).toBe(429)
  })

  it("allow 3 magic-link requests a minute, then answer 429", async () => {
    const request = (): Promise<Response> =>
      post("/auth/sign-in/magic-link", "203.0.113.50", { email: "nobody@example.com" })

    const first = await statuses(3, request)
    const over = await request()

    expect(first).toEqual([200, 200, 200])
    expect(over.status).toBe(429)
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

async function waitForHealth(): Promise<void> {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${baseUrl}/api/health`)).ok) return
    } catch {
      // not listening yet
    }
    await new Promise((wait) => setTimeout(wait, 250))
  }
  throw new Error("Rate-limit test server did not start")
}
