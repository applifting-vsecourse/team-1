// Seed accounts (CONTRIBUTING.md, „Účty ze seedu“). The E2E database is
// re-seeded before every run, so these always exist.
export type Account = { email: string; password: string }

export const ORGANIZER: Account = { email: "organizator@example.com", password: "password1" }
export const PARTICIPANT: Account = { email: "ucastnik@example.com", password: "password4" }

/** Public application link of the seeded „Letní kemp 2027“ (terms 4 500 + 4 900 CZK). */
export const SUMMER_CAMP_LINK = "/apply/demo-letni-kemp-2027"

/** The E2E backend (playwright.config.ts) — for checks that skip the UI and ask the server directly. */
export const API_URL = `http://localhost:${process.env.E2E_BACKEND_PORT ?? 4190}/api`
