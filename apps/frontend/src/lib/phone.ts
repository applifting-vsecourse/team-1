/**
 * The phone number of an application (edit by the participant, manual add by the organizer).
 * An identical copy of the backend definition (`apps/backend/src/shared/domain/phone.ts`; there is
 * no shared package between the apps), both tested against the same examples.
 *
 * The number is required (D-079, D-153). Separators (`+420 (777) 123-456`) are dropped; what
 * remains is an optional leading `+` and 7 to 15 digits (E.164 allows 15 digits at most, country
 * code included).
 */
export const PHONE_PATTERN = /^\+?[0-9]{7,15}$/

/** Longest raw input worth typing, before the separators are dropped. */
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
