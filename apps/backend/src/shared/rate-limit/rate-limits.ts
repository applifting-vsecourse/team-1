const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS

/**
 * Public application submissions per client IP (#294). Numbers from the
 * product manager: 20 a minute lets a family or a school on one network apply
 * in a burst, 100 an hour stops a steady flood.
 */
export const APPLICATION_SUBMIT_LIMITS = [
  { name: "minute", ttl: MINUTE_MS, limit: 20 },
  { name: "hour", ttl: HOUR_MS, limit: 100 },
]

/**
 * Sign-in limits per client IP, on top of BetterAuth's defaults (#294).
 * Paths are relative to `/api/auth`, windows in seconds.
 * - password: 5 attempts a minute stops guessing, a typo or two still passes;
 * - magic link: each request sends an e-mail, so 3 a minute.
 */
export const AUTH_RATE_LIMIT_RULES = {
  "/sign-in/email": { window: 60, max: 5 },
  "/sign-in/magic-link": { window: 60, max: 3 },
}
