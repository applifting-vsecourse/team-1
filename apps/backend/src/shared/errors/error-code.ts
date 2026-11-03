/**
 * Machine-readable error codes in API responses: `{ statusCode, code, message }`.
 * The frontend translates them (apps/frontend/src/i18n/locales/{en,cs}/errors.json),
 * so `message` stays English and is only a fallback.
 *
 * Adding a code: add it here AND to both errors.json files — the frontend
 * shows the generic message for codes it doesn't know.
 */
export const ERROR_CODES = [
  "ROOM_NAME_TAKEN",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_FAILED",
  "PAYMENT_ALREADY_RECORDED",
  "REFUND_EXCEEDS_OVERPAYMENT",
  "REFUND_TERM_REQUIRED",
  "PAYMENT_TERM_NOT_IN_APPLICATION",
  "PASSWORD_REQUIRED",
  "PASSWORD_ALREADY_SET",
  "ROOM_NAME_TAKEN",
  "TERM_END_BEFORE_START",
  "TERM_CANCELLED",
  "TERM_LIMIT_REACHED",
  "EVENT_HAS_APPLICATIONS",
  "EVALUATION_MODE_LOCKED",
  "PUBLIC_PAGE_INCOMPLETE",
  "PHOTO_TOO_LARGE",
  "PHOTO_INVALID_TYPE",
  "APPLICATION_DUPLICATE",
  "INVALID_STATUS_TRANSITION",
  "CAPACITY_EXCEEDED",
  "EMAIL_DELIVERY_FAILED",
  "INTERNAL",
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]
