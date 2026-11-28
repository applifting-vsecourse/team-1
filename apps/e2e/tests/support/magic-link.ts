import type { Page } from "@playwright/test"
import pg from "pg"
import { e2eDatabaseUrl } from "../../scripts/database-url.mjs"

/**
 * The newest unspent magic-link token. E-mails go to the backend console, so the
 * test reads the token BetterAuth stored (`verification.identifier` = `magic-link:`
 * + the token, see magicLinkIdentifier in the backend) instead of the e-mail.
 */
export async function latestMagicLinkToken(): Promise<string> {
  const client = new pg.Client({ connectionString: e2eDatabaseUrl() })
  await client.connect()
  try {
    const { rows } = await client.query<{ identifier: string }>(
      `SELECT identifier FROM verification WHERE identifier LIKE 'magic-link:%' ORDER BY "createdAt" DESC NULLS LAST LIMIT 1`,
    )
    if (!rows[0]) throw new Error("No magic-link token in the E2E database.")
    return rows[0].identifier.slice("magic-link:".length)
  } finally {
    await client.end()
  }
}

/**
 * Asks for a sign-in link the way a participant does: „No password?“ on the sign-in card turns it
 * into the link request in the same card. The labels follow the UI language.
 */
export async function requestSignInLink(
  page: Page,
  email: string,
  labels = { noPassword: "No password?", send: "Send sign-in link" },
) {
  await page.goto("/participant/login")
  await page.getByRole("button", { name: labels.noPassword }).click()
  await page.getByLabel("E-mail").fill(email)
  await page.getByRole("button", { name: labels.send }).click()
}
