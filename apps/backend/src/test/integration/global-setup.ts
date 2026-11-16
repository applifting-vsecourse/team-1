// Runs once before all integration tests:
//   1. create the test database if needed and apply every migration,
//   2. build the backend and start it against that database.
// Tests then talk to the real built server over HTTP — the same artifact that
// runs on staging. (Importing the Nest app into Jest is not an option:
// better-auth ships ESM only and Jest runs CommonJS.)
// No `@/` imports here: globalSetup runs outside moduleNameMapper.
import { ChildProcess, execSync, spawn } from "node:child_process"
import { appendFileSync, writeFileSync } from "node:fs"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"
// eslint-disable-next-line no-restricted-imports -- globalSetup is not resolved through the `@/` alias
import { PrismaClient } from "../../generated/prisma/client"
import { resolveTestDatabaseUrl } from "./test-database-url"

export const backendRoot = resolve(__dirname, "../../..")

declare global {
  var __TOGENA_TEST_SERVER__: ChildProcess | undefined
}

export default async function globalSetup(): Promise<void> {
  dotenv.config({ path: resolve(backendRoot, ".env"), quiet: true })
  const testUrl = resolveTestDatabaseUrl()

  await ensureDatabase(testUrl)
  run("npx prisma migrate deploy", testUrl)
  run("npx prisma generate && npx nest build", testUrl)

  const port = await freePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const server = spawn("node", ["dist/main.js"], {
    cwd: backendRoot,
    env: {
      ...process.env,
      DATABASE_URL: testUrl,
      PORT: String(port),
      BACKEND_URL: baseUrl,
      NODE_ENV: "test",
      // E-mails always go to the console (never to Resend or SMTP), whatever .env holds.
      RESEND_API_KEY: "",
      SMTP_HOST: "",
      // #294: every test sends from 127.0.0.1; rate-limit.int-spec.ts starts its own server with limits on.
      RATE_LIMIT_ENABLED: "false",
      // US-115: the participant's simulated payment is available.
      PAYMENT_SIMULATION_ENABLED: "true",
      // US-106: the waitlist expiry job runs every second so a test does not have to wait.
      WAITLIST_EXPIRY_INTERVAL_MS: "1000",
      // Staging bypass of the verification e-mail; email-verification-bypass.int-spec.ts starts its own server with it off.
      EMAIL_VERIFICATION_BYPASS_ENABLED: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
  })
  // The console mailer prints every e-mail; tests read it from this copy (`latestEmailLink`).
  const mailLog = join(tmpdir(), `togena-int-mail-${port}.log`)
  writeFileSync(mailLog, "")
  let output = ""
  const collect = (chunk: Buffer): void => {
    output += chunk.toString()
    appendFileSync(mailLog, chunk)
  }
  server.stdout?.on("data", collect)
  server.stderr?.on("data", collect)
  globalThis.__TOGENA_TEST_SERVER__ = server

  await waitForHealth(baseUrl, () => output)
  // Inherited by the test workers.
  process.env.TEST_API_URL = baseUrl
  process.env.TEST_MAIL_LOG = mailLog
}

async function ensureDatabase(testUrl: string): Promise<void> {
  const url = new URL(testUrl)
  const databaseName = url.pathname.slice(1)
  const adminUrl = new URL(testUrl)
  adminUrl.pathname = "/postgres"

  const admin = new PrismaClient({
    adapter: new PrismaPg({ connectionString: adminUrl.toString() }),
  })
  try {
    const existing = await admin.$queryRawUnsafe<unknown[]>(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      databaseName,
    )
    if (existing.length === 0) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`)
    }
  } catch (error) {
    // `cause` via assign: the backend targets ES2017, whose Error has no options argument.
    throw Object.assign(
      new Error(
        `Integration tests need Postgres at ${adminUrl.host} — start it with ` +
          "`pnpm backend docker:up:wait`.",
      ),
      { cause: error },
    )
  } finally {
    await admin.$disconnect()
  }
}

function run(command: string, databaseUrl: string): void {
  execSync(command, {
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  })
}

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

async function waitForHealth(baseUrl: string, output: () => string): Promise<void> {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`)
      if (response.ok) return
    } catch {
      // not listening yet
    }
    await new Promise((wait) => setTimeout(wait, 250))
  }
  globalThis.__TOGENA_TEST_SERVER__?.kill()
  throw new Error(`Test server did not start:\n${output()}`)
}
