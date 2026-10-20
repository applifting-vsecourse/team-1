import { ROUTES } from "@/app/routes"
import { env } from "@/config/env"

/**
 * The BetterAuth endpoint that spends the one-time token, signs the
 * participant in and redirects: to choosing a password on success (the page
 * passes on to the application when a password already exists), back to
 * the link page with `?error=…` otherwise. Called only after a click on the
 * link page — a mail scanner that merely opens the e-mail link must not use up the token.
 */
export function magicLinkVerifyUrl(token: string, origin: string) {
  const url = new URL("/api/auth/magic-link/verify", env.VITE_BETTER_AUTH_URL)
  url.searchParams.set("token", token)
  url.searchParams.set("callbackURL", `${origin}${ROUTES.participant.setPassword}`)
  url.searchParams.set("errorCallbackURL", `${origin}${ROUTES.participant.magicLink}`)
  return url.toString()
}
