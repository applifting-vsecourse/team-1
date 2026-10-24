import pg from "pg"
import { e2eDatabaseUrl } from "../../scripts/database-url.mjs"

/** Id of a seeded event, found by the token of its application link. */
export async function eventIdByPublicToken(publicToken: string): Promise<string> {
  const client = new pg.Client({ connectionString: e2eDatabaseUrl() })
  await client.connect()
  try {
    const { rows } = await client.query<{ id: string }>(
      `SELECT id FROM "event" WHERE "publicToken" = $1`,
      [publicToken],
    )
    return rows[0].id
  } finally {
    await client.end()
  }
}
