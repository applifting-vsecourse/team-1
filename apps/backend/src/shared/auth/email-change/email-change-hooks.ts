/** An account whose sign-in e-mail has just been verified (and, after a change, replaced). */
export type VerifiedUser = { id: string; email: string }

type Listener = (user: VerifiedUser) => Promise<void>

const listeners: Listener[] = []

/**
 * Lets a domain module react to a changed sign-in e-mail without the auth setup
 * knowing that module (US-125): the applications module registers itself and moves the
 * contact e-mail of the account's applications. BetterAuth calls `publish` from its
 * `afterEmailVerification` hook, which also runs after a plain verification, so listeners
 * must do nothing when everything is already up to date.
 */
export const emailChangeHooks = {
  onVerified(listener: Listener): void {
    listeners.push(listener)
  },
  async publish(user: VerifiedUser): Promise<void> {
    for (const listener of listeners) await listener(user)
  },
}
