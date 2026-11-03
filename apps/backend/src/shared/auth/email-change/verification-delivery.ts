import { AsyncLocalStorage } from "node:async_hooks"

/**
 * BetterAuth only logs an error thrown by `sendVerificationEmail` and answers „ok“, so a
 * refused link e-mail would look like a success (US-125). The auth setup marks the failure
 * here and the caller that started the request reads it afterwards.
 */
export type VerificationDelivery = { isFailed: boolean }

export const verificationDelivery = new AsyncLocalStorage<VerificationDelivery>()
