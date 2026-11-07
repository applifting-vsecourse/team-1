export const CANCELLATION_TERMS_MAX_LENGTH = 2000

/** The text the organizer wrote, trimmed; `null` when it is empty or too long. */
export function normalizeCancellationTerms(value: string): string | null {
  const text = value.trim()
  return text.length > 0 && text.length <= CANCELLATION_TERMS_MAX_LENGTH ? text : null
}
