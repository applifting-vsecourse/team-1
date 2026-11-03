import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { PrismaService } from "@/core/prisma/prisma.service"

const backendRoot = resolve(__dirname, "../../..")

/** URL of the built test server started in global-setup.ts, e.g. `api('/me')`. */
export function api(path: string): string {
  const baseUrl = process.env.TEST_API_URL
  if (!baseUrl) throw new Error("TEST_API_URL is not set — run via `pnpm backend test:int`.")
  return `${baseUrl}/api${path}`
}

/** Prisma connected to the test database (setup-env.ts points DATABASE_URL there). */
export async function connectTestPrisma(): Promise<PrismaService> {
  const prisma = new PrismaService()
  await prisma.$connect()
  return prisma
}

/**
 * Wipes the test database and runs the regular (built) seed: the same
 * organizations, organizers, events and applications as `pnpm dev`
 * (CONTRIBUTING.md, „Účty ze seedu“).
 */
export async function resetAndSeed(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "organization", "session", "account", "verification", "user" RESTART IDENTITY CASCADE;',
  )
  execSync("node dist/scripts/seed/seed.script.js", {
    cwd: backendRoot,
    env: process.env,
    stdio: "pipe",
  })
}

/** Next free `Term.number` of an event — for tests that create terms straight through Prisma. */
export async function nextTermNumber(prisma: PrismaService, eventId: string): Promise<number> {
  const { _max } = await prisma.term.aggregate({ where: { eventId }, _max: { number: true } })
  return (_max.number ?? 0) + 1
}

/** Signs in via BetterAuth and returns the Cookie header for further requests. */
export async function signIn(email: string, password: string): Promise<string> {
  const response = await fetch(api("/auth/sign-in/email"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // BetterAuth checks the origin of cookie-based requests.
      Origin: process.env.FRONTEND_URL ?? "http://localhost:3050",
    },
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) {
    throw new Error(`Sign-in as ${email} failed: ${response.status} ${await response.text()}`)
  }
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ")
}

/** What the console mailer printed for one e-mail (see `ConsoleMailerAdapter`). */
export type SentEmail = { to: string; subject: string; links: string[] }

/**
 * The newest e-mail sent to `to`, read from the copy of the server's console that
 * global-setup.ts keeps. Waits briefly: the server prints after it has answered.
 */
export async function latestEmailTo(to: string, waitMs = 5000): Promise<SentEmail | undefined> {
  const path = process.env.TEST_MAIL_LOG
  if (!path) throw new Error("TEST_MAIL_LOG is not set — run via `pnpm backend test:int`.")
  const deadline = Date.now() + waitMs
  for (;;) {
    const blocks = readFileSync(path, "utf8").split("====== Email Sent ======").slice(1)
    const mails = blocks.flatMap((block) => {
      const [, recipient, subject] = block.match(/To: (\S+)\s+Subject: ([^\n]*)/) ?? []
      if (!recipient) return []
      const links = [...block.matchAll(/Link: (\S+)/g)].map(([, link]) => link)
      return [{ to: recipient, subject: subject.trim(), links }]
    })
    const matching = mails.filter((mail) => mail.to === to)
    const found = matching[matching.length - 1]
    if (found || Date.now() > deadline) return found
    await new Promise((wait) => setTimeout(wait, 100))
  }
}

/** Whether the server has sent nothing to `to` (after a grace period for the log to catch up). */
export async function hasSentNothingTo(to: string): Promise<boolean> {
  return (await latestEmailTo(to, 500)) === undefined
}
