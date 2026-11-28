import type { TFunction } from "i18next"

import { isRateLimited } from "@/features/auth/lib/auth-request-error"

/**
 * The one line for a sign-in link that wasn't sent: the server's rate limit (3 a minute from
 * one address) says to wait, anything else to try again.
 */
export function linkRequestError(
  error: unknown,
  t: TFunction<"auth">,
  tErrors: TFunction<"errors">,
): string {
  return isRateLimited(error) ? tErrors("TOO_MANY_REQUESTS") : t("requestLink.failed")
}
