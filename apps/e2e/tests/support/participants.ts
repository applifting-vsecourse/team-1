import pg from "pg"
import { e2eDatabaseUrl } from "../../scripts/database-url.mjs"

/**
 * A participant account without a password, the way a submitted application
 * leaves it (`mustSetPassword`, no credential account). The seed stays as it
 * is: every test makes its own account with a unique e-mail.
 */
export async function createParticipantWithoutPassword(): Promise<{ email: string }> {
  const email = `novy-${Date.now()}@example.com`
  const client = new pg.Client({ connectionString: e2eDatabaseUrl() })
  await client.connect()
  try {
    await client.query(
      `INSERT INTO "user" (id, name, email, "emailVerified", "accountType", "mustSetPassword", locale, "createdAt", "updatedAt")
       VALUES ($1, 'Nový Účastník', $1, true, 'PARTICIPANT', true, 'en', now(), now())`,
      [email],
    )
  } finally {
    await client.end()
  }
  return { email }
}
