/**
 * What the participant (and the organizer for them, D-191) can write in a term. One place for
 * both roles, the read of the organizer and the overview of the participant.
 */
type TermState = { status: string; termCancelled: boolean }

/** Roommate wishes: a confirmed term that is not cancelled, and no individual accommodation (US-146). */
export const canWriteRoomWishes = (term: TermState, individualAccommodation: boolean): boolean =>
  term.status === "CONFIRMED" && !term.termCancelled && !individualAccommodation

/** Later arrival and earlier departure: while the application in the term is not cancelled or archived (US-143). */
export const canWriteStay = (term: TermState): boolean =>
  term.status !== "CANCELLED" && term.status !== "ARCHIVED" && !term.termCancelled
