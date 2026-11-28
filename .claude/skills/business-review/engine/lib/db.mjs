// Direct write to the LOCAL database, only for states the API cannot create quickly (verified e-mail,
// archived term). Change only records created by the scenario.
import path from "node:path"
import { createRequire } from "node:module"
import { DATABASE_URL, REPO } from "./env.mjs"

const { Client } = createRequire(path.join(REPO, "apps/e2e/package.json"))("pg")

export async function db(fn) {
  if (!DATABASE_URL) throw new Error("Chybí DATABASE_URL v apps/backend/.env")
  const host = new URL(DATABASE_URL).hostname
  if (!["localhost", "127.0.0.1"].includes(host))
    throw new Error(`Odmítám zapisovat do nelokální databáze (${host}).`)
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}
