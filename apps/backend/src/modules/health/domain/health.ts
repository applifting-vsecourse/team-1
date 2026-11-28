/** Longest health note the participant may save (US-68). */
export const HEALTH_NOTE_MAX_LENGTH = 2000

/** What the participant sends: the note and whether they explicitly consent to its processing. */
export type HealthInput = {
  note: string
  consent: boolean
  /** The participant confirms having no health restriction (US-150); only valid with an empty note. */
  noRestriction?: boolean
}

export type HealthDecision =
  /** Nothing to keep: an empty note removes the record, no consent needed. */
  | { kind: "clear" }
  /** The participant confirms having no restriction (US-150): nothing stored, only the flag. */
  | { kind: "none" }
  /** "No restriction" together with a note contradicts itself. */
  | { kind: "invalid" }
  | { kind: "save"; note: string }
  /** A note without the explicit consent is never stored. */
  | { kind: "consent-required" }

/**
 * The one rule of the health restriction (US-68): filling it in requires the explicit consent
 * with its processing. Whitespace around the note is dropped; an empty note clears the record.
 */
export function decideHealth({ note, consent, noRestriction }: HealthInput): HealthDecision {
  const trimmed = note.trim()
  if (noRestriction === true) return trimmed === "" ? { kind: "none" } : { kind: "invalid" }
  if (trimmed === "") return { kind: "clear" }
  if (!consent) return { kind: "consent-required" }
  return { kind: "save", note: trimmed }
}

/**
 * Once the participant has filled the restriction in, only an organizer can change it: the
 * participant sends a change request instead (US-68). Before the first fill they write it directly.
 */
export const healthWriteRoute = (hasStoredNote: boolean): "write" | "request" =>
  hasStoredNote ? "request" : "write"

/** The stored restriction with who it belongs to — what both screens show. */
export type HealthRecord = {
  applicationId: string
  eventName: string
  firstName: string
  lastName: string
  /** `null` while the participant has not filled it in. */
  note: string | null
  /** The participant confirmed having no health restriction (US-150); never together with a note. */
  noRestriction: boolean
  /** When the explicit consent was given; `null` together with the note. */
  consentAt: Date | null
  /**
   * The first entry is possible while a term that is not cancelled is not over. A stored note
   * still changes through a request at any time (D-122).
   */
  editable: boolean
  /** The participant's change request awaiting the organizer, if any. */
  pendingRequest: { note: string; createdAt: Date } | null
}
