/**
 * Machine-readable error codes in API responses: `{ statusCode, code, message }`.
 * The frontend translates them (apps/frontend/src/i18n/locales/{en,cs}/errors.json),
 * so `message` stays English and is only a fallback.
 *
 * Adding a code: add it here AND to both errors.json files — the frontend
 * shows the generic message for codes it doesn't know.
 */
export const ERROR_CODES = [
  "CAPACITY_MODE_NOT_SUPPORTED",
  "CAPACITY_ROOM_GENDER_REQUIRED",
  "ROOM_NAME_TAKEN",
  "ROOM_MODE_REQUIRES_EMPTY_ROOMS",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_FAILED",
  "PAYMENT_ALREADY_RECORDED",
  "REFUND_EXCEEDS_OVERPAYMENT",
  "PASSWORD_REQUIRED",
  "PASSWORD_ALREADY_SET",
  "ROOM_NAME_TAKEN",
  "ROOM_MODE_REQUIRES_EMPTY_ROOMS",
  "TERM_END_BEFORE_START",
  "TERM_CANCELLED",
  "EVENT_HAS_APPLICATIONS",
  "EVALUATION_MODE_LOCKED",
  "APPLICATION_DUPLICATE",
  "INVALID_STATUS_TRANSITION",
  "CAPACITY_EXCEEDED",
  "INTERNAL",
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]
