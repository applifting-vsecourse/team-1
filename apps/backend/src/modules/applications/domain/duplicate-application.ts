/** One participant on one term, as stored or as submitted. */
export type ParticipantOnTerm = {
  firstName: string
  lastName: string
  /** `YYYY-MM-DD` */
  birthDate: string
  termId: string
}

/**
 * Name as compared for duplicates: case, diacritics and surrounding or
 * repeated whitespace do not matter ("Jan  Novák" = "jan novak").
 */
export function normalizeName(name: string): string {
  return name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/g, " ")
}

const identityKey = ({ firstName, lastName, birthDate }: Omit<ParticipantOnTerm, "termId">) =>
  `${normalizeName(firstName)}|${normalizeName(lastName)}|${birthDate}`

/**
 * First submitted participant that is already registered on one of the terms
 * they select (same name and birth date, US-23), either in `existing` or
 * earlier in the same submission. Returns null when there is none.
 */
export function findDuplicate(
  existing: ParticipantOnTerm[],
  submitted: (Omit<ParticipantOnTerm, "termId"> & { termIds: string[] })[],
): { participant: Omit<ParticipantOnTerm, "termId">; termId: string } | null {
  const taken = new Set(existing.map((row) => `${identityKey(row)}|${row.termId}`))
  for (const participant of submitted) {
    const key = identityKey(participant)
    for (const termId of participant.termIds) {
      if (taken.has(`${key}|${termId}`)) return { participant, termId }
    }
    for (const termId of participant.termIds) taken.add(`${key}|${termId}`)
  }
  return null
}
