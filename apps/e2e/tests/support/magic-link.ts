import pg from "pg"
import { e2eDatabaseUrl } from "../../scripts/database-url.mjs"

/**
 * The newest unspent magic-link token. E-mails go to the backend console, so the
 * test reads the token BetterAuth stored (`verification.identifier` = the token,
 * see the magic-link plugin) instead of the e-mail.
 */
export async function latestMagicLinkToken(): Promise<string> {
  const client = new pg.Client({ connectionString: e2eDatabaseUrl() })
  await client.connect()
  try {
    const { rows } = await client.query<{ identifier: string }>(
      `SELECT identifier FROM verification ORDER BY "createdAt" DESC NULLS LAST LIMIT 1`,
    )
    if (!rows[0]) throw new Error("No magic-link token in the E2E database.")
    return rows[0].identifier
  } finally {
    await client.end()
  }
}
