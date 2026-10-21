// Started by Playwright (webServer in playwright.config.ts):
//   1. build the backend,
//   2. recreate the E2E database (togena_e2e) and apply the migrations,
//   3. seed it (the same accounts and events as `pnpm dev`, see CONTRIBUTING.md),
//   4. run the built server on the E2E port until Playwright stops it.
import { execSync, spawn } from "node:child_process"
import pg from "pg"
import { backendRoot, e2eDatabaseUrl, fileEnv } from "./database-url.mjs"

const port = process.env.E2E_BACKEND_PORT ?? "4190"
const frontendUrl = process.env.E2E_FRONTEND_URL ?? "http://localhost:3190"
const databaseUrl = e2eDatabaseUrl()

const env = {
  ...fileEnv,
  ...process.env,
  DATABASE_URL: databaseUrl,
  PORT: port,
  BACKEND_URL: `http://localhost:${port}`,
  FRONTEND_URL: frontendUrl,
  NODE_ENV: "test",
}

const run = (command) => execSync(command, { cwd: backendRoot, env, stdio: "inherit" })

run("pnpm build")
await recreateDatabase(databaseUrl)
run("npx prisma migrate deploy")
run("node dist/scripts/seed/seed.script.js")

const server = spawn("node", ["dist/main.js"], { cwd: backendRoot, env, stdio: "inherit" })
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal))
server.on("exit", (code) => process.exit(code ?? 0))

/** Every run starts from an empty database, so tests never depend on leftovers. */
async function recreateDatabase(url) {
  const name = new URL(url).pathname.slice(1)
  if (!name.endsWith("_e2e")) throw new Error(`Refusing to wipe "${name}" — not an E2E database.`)

  const adminUrl = new URL(url)
  adminUrl.pathname = "/postgres"
  const admin = new pg.Client({ connectionString: adminUrl.toString() })
  try {
    await admin.connect()
  } catch (error) {
    throw new Error(
      `E2E needs Postgres at ${adminUrl.host} — run \`pnpm backend docker:up:wait\`.`,
      { cause: error },
    )
  }
  try {
    await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
    await admin.query(`CREATE DATABASE "${name}"`)
  } finally {
    await admin.end()
  }
}
