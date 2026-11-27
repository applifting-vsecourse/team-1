export type EmailContent = { subject: string; html: string }

export type ClaimedEmailJob = {
  id: string
  /** Unique per business event and message; also the provider's idempotency key. */
  dedupeKey: string
  recipient: string
  /** Template data, rendered at the first attempt. */
  payload: unknown
  /** Stored at the first attempt, so every attempt sends exactly the same message. */
  content: EmailContent | null
  /** This one included. */
  attempts: number
  firstAttemptAt: Date
  mayHaveBeenSent: boolean
  /** The previous worker never reported back (restart, crash) while sending it. */
  isAbandoned: boolean
}

export abstract class EmailJobRepository {
  /**
   * Takes the oldest job that is due, or abandoned for longer than the lease, so that no other
   * worker takes it, and counts the attempt. Null when there is none.
   */
  abstract claimNext(now: Date): Promise<ClaimedEmailJob | null>
  abstract saveContent(id: string, content: EmailContent): Promise<void>
  /** Also drops the payload and the content: they hold personal data and an access link. */
  abstract markSent(id: string, sentAt: Date): Promise<void>
  abstract scheduleRetry(
    id: string,
    retry: { nextAttemptAt: Date; mayHaveBeenSent: boolean; error: string },
  ): Promise<void>
  abstract giveUp(id: string, status: "FAILED" | "UNCERTAIN", error: string): Promise<void>
}
