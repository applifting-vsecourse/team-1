// Where the E2E database lives — shared by the backend starter and the test helpers.
import { resolve } from "node:path"
import dotenv from "dotenv"

const backendRoot = resolve(import.meta.dirname, "../../backend")

export const fileEnv =
  dotenv.config({ path: resolve(backendRoot, ".env"), quiet: true }).parsed ?? {}
export { backendRoot }

/** DATABASE_URL with `_e2e` appended to the database name — never the dev database. */
export function e2eDatabaseUrl() {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL
  const base = process.env.DATABASE_URL ?? fileEnv.DATABASE_URL
  if (!base) throw new Error("Set DATABASE_URL in apps/backend/.env (run `pnpm env:check`).")
  const url = new URL(base)
  url.pathname = `${url.pathname}_e2e`
  return url.toString()
}

/** Copy of the E2E backend's console output; the console mailer prints each e-mail there. */
export const mailLogPath = resolve(import.meta.dirname, "../test-results-mail.log")
