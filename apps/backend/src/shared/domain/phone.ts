/**
 * The phone number of an application (edit by the participant, manual add by the organizer).
 * The one definition of its format: the frontend keeps an identical copy in
 * `apps/frontend/src/lib/phone.ts` (there is no shared package between the apps), and both are
 * tested against the same examples.
 *
 * The number is required (D-079, D-153). People type separators (`+420 (777) 123-456`), which are
 * dropped; what remains is an optional leading `+` and 7 to 15 digits (E.164 allows 15 digits at
 * most, country code included).
 */
export const PHONE_PATTERN = /^\+?[0-9]{7,15}$/

/** Longest raw input worth looking at, before the separators are dropped. */
export const MAX_PHONE_INPUT_LENGTH = 40

/** Drops whitespace and the usual separators; an empty result is no phone (`null`, not valid). */
export function normalizePhone(value: string | null | undefined): string | null {
  const phone = value?.replace(/[\s().-]/g, "") ?? ""
  return phone === "" ? null : phone
}

/** Whether a normalized phone is there and has the right format; `null` (no phone) is not valid. */
export function isValidPhone(phone: string | null): phone is string {
  return phone !== null && PHONE_PATTERN.test(phone)
}
