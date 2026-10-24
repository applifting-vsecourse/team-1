// Seed accounts (CONTRIBUTING.md, „Účty ze seedu“). The E2E database is
// re-seeded before every run, so these always exist.
export type Account = { email: string; password: string }

export const ORGANIZER: Account = { email: "organizator@example.com", password: "password1" }
export const PARTICIPANT: Account = { email: "ucastnik@example.com", password: "password4" }

/** Public application link of the seeded „Letní kemp 2027“ (terms 4 500 + 4 900 CZK). */
export const SUMMER_CAMP_LINK = "/apply/demo-letni-kemp-2027"

/** Application link token of „Horský víkend 2027“ of „Horský spolek Sněžka“, which ORGANIZER isn't a member of. */
export const MOUNTAIN_WEEKEND_TOKEN = "demo-horsky-vikend-2027"
