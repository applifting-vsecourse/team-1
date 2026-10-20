import { execSync } from "node:child_process"
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
    throw new Error(`Sign-in as ${email} failed: ${response.status}`)
  }
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ")
}
