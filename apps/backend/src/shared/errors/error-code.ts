/**
 * Machine-readable error codes in API responses: `{ statusCode, code, message }`.
 * The frontend translates them (apps/frontend/src/i18n/locales/{en,cs}/errors.json),
 * so `message` stays English and is only a fallback.
 *
 * Adding a code: add it here AND to both errors.json files — the frontend
 * shows the generic message for codes it doesn't know.
 */
export const ERROR_CODES = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_FAILED",
  "EMAIL_NOT_ALLOWED",
  "INTERNAL",
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]
