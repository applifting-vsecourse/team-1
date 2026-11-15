/** Longest note to the organizer about the individual accommodation (US-38). */
export const MAX_ACCOMMODATION_NOTE_LENGTH = 2000

/**
 * The request for individual accommodation as it is stored: the note belongs to the request, so
 * without the request there is no note, and an empty note is none.
 */
export function normalizeAccommodation(
  individualAccommodation: boolean | undefined,
  note: string | null | undefined,
): { individualAccommodation: boolean; accommodationRequest: string | null } {
  if (!individualAccommodation)
    return { individualAccommodation: false, accommodationRequest: null }
  return { individualAccommodation: true, accommodationRequest: note?.trim() || null }
}
