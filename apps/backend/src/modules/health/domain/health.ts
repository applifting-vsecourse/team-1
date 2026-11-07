/** Longest health note the participant may save (US-68). */
export const HEALTH_NOTE_MAX_LENGTH = 2000

/** What the participant sends: the note and whether they explicitly consent to its processing. */
export type HealthInput = { note: string; consent: boolean }

export type HealthDecision =
  /** Nothing to keep: an empty note removes the record, no consent needed. */
  | { kind: "clear" }
  | { kind: "save"; note: string }
  /** A note without the explicit consent is never stored. */
  | { kind: "consent-required" }

/**
 * The one rule of the health restriction (US-68): filling it in requires the explicit consent
 * with its processing. Whitespace around the note is dropped; an empty note clears the record.
 */
export function decideHealth({ note, consent }: HealthInput): HealthDecision {
  const trimmed = note.trim()
  if (trimmed === "") return { kind: "clear" }
  if (!consent) return { kind: "consent-required" }
  return { kind: "save", note: trimmed }
}

/** The stored restriction with who it belongs to — what both screens show. */
export type HealthRecord = {
  applicationId: string
  eventName: string
  firstName: string
  lastName: string
  /** `null` while the participant has not filled it in. */
  note: string | null
  /** When the explicit consent was given; `null` together with the note. */
  consentAt: Date | null
}
