import { DeliveryOutcome } from "@/core/email/interfaces/email-delivery.error"

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS

/** Waits before the 2nd to 5th attempt, about 14 hours in total (#737). */
export const RETRY_DELAYS_MS = [MINUTE_MS, 15 * MINUTE_MS, 2 * HOUR_MS, 12 * HOUR_MS]
export const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1

/** Within the 24 hours Resend remembers a key, with an hour to spare. */
export const IDEMPOTENCY_WINDOW_MS = 23 * HOUR_MS

/**
 * `FAILED`: certainly not delivered. `UNCERTAIN`: may have been delivered, so it is not sent
 * again — a missing e-mail is preferred to a double one.
 */
export type FailureVerdict =
  | { status: "PENDING"; nextAttemptAt: Date; mayHaveBeenSent: boolean }
  | { status: "FAILED" | "UNCERTAIN" }

export function afterFailure(input: {
  /** Attempts made so far, this one included. */
  attempts: number
  outcome: DeliveryOutcome
  /** An earlier attempt ended without a known result. */
  mayHaveBeenSent: boolean
  isProviderIdempotent: boolean
  now: Date
}): FailureVerdict {
  const { attempts, outcome, isProviderIdempotent, now } = input
  if (outcome === "CONFLICT") return { status: "UNCERTAIN" }
  if (outcome === "UNKNOWN" && !isProviderIdempotent) return { status: "UNCERTAIN" }
  const mayHaveBeenSent = input.mayHaveBeenSent || outcome === "UNKNOWN"
  if (attempts >= MAX_ATTEMPTS) return { status: mayHaveBeenSent ? "UNCERTAIN" : "FAILED" }
  const nextAttemptAt = new Date(now.getTime() + RETRY_DELAYS_MS[attempts - 1])
  return { status: "PENDING", nextAttemptAt, mayHaveBeenSent }
}

/** Whether another attempt cannot deliver the message a second time. */
export function canSendSafely(input: {
  mayHaveBeenSent: boolean
  firstAttemptAt: Date
  isProviderIdempotent: boolean
  now: Date
}): boolean {
  if (!input.mayHaveBeenSent) return true
  const age = input.now.getTime() - input.firstAttemptAt.getTime()
  return input.isProviderIdempotent && age < IDEMPOTENCY_WINDOW_MS
}
