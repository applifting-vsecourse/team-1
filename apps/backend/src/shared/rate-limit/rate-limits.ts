const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS

/**
 * Public application submissions per client IP (#294), raised for the opening rush (#739): many
 * people of a school or a company apply from one address, while 100 a minute is still only a
 * fifth of the 500 a minute of US-74.
 *
 * Source: tech lead's decision of 27 November 2026, option a) of
 * https://github.com/applifting-vsecourse/team-1/issues/739#issuecomment-7213519465
 * Replaces the numbers of D-150 (20 a minute, 100 an hour).
 */
export const APPLICATION_SUBMIT_LIMITS = [
  { name: "minute", ttl: MINUTE_MS, limit: 100 },
  { name: "hour", ttl: HOUR_MS, limit: 500 },
]

/**
 * Public application submissions per e-mail address of the applicant, from any IP (#739, same
 * decision): the higher IP limit must not allow flooding one mailbox with confirmations.
 */
export const APPLICANT_EMAIL_LIMIT = { name: "applicantEmail", ttl: HOUR_MS, limit: 10 }

/**
 * Skipping the verification link on staging/demo: 3 tries a minute per client IP, like asking
 * for another verification e-mail. Replaces the per-minute limit of the public application
 * (the hourly one still applies).
 */
export const EMAIL_VERIFICATION_BYPASS_LIMIT = { limit: 3, ttl: MINUTE_MS }

/**
 * Sign-in limits per client IP, on top of BetterAuth's defaults (#294).
 * Paths are relative to `/api/auth`, windows in seconds.
 * - password: 5 attempts a minute stops guessing, a typo or two still passes;
 * - magic link: each request sends an e-mail, so 3 a minute.
 */
export const AUTH_RATE_LIMIT_RULES = {
  "/sign-in/email": { window: 60, max: 5 },
  "/sign-in/magic-link": { window: 60, max: 3 },
  "/sign-up/email": { window: 60, max: 3 },
  "/send-verification-email": { window: 60, max: 3 },
}
