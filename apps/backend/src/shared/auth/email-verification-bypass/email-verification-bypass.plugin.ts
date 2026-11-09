import { EMAIL_VERIFICATION_TTL_SECONDS } from "@/shared/auth/email-verification-ttl"
import { Config } from "@/shared/config/config.service"
import type { BetterAuthPlugin } from "better-auth"
import { APIError, createAuthEndpoint } from "better-auth/api"
import { setSessionCookie } from "better-auth/cookies"

const BYPASS_PATH = "/email-verification-bypass"

const bypassError = (status: "FORBIDDEN" | "NOT_FOUND", code: string): APIError =>
  new APIError(status, { code, message: code })

/**
 * Staging and demo only: environments without a verified sender domain cannot deliver the
 * verification link, so the organizer could never finish registration. While
 * EMAIL_VERIFICATION_BYPASS_ENABLED is on, a button on "Verify your e-mail" marks the
 * account verified and signs it in. It only reaches an organizer account that is still
 * unverified and was registered within the lifetime of the verification link, so it cannot
 * verify an older account, and an e-mail change (which keeps a verified account) never
 * goes through it.
 */
export const createEmailVerificationBypassPlugin = (config: Config): BetterAuthPlugin => ({
  id: "email-verification-bypass",
  endpoints: {
    emailVerificationBypassStatus: createAuthEndpoint(
      `${BYPASS_PATH}/status`,
      { method: "GET" },
      async (ctx) => ctx.json({ enabled: config.emailVerificationBypassEnabled }),
    ),
    emailVerificationBypass: createAuthEndpoint(BYPASS_PATH, { method: "POST" }, async (ctx) => {
      if (!config.emailVerificationBypassEnabled) {
        throw bypassError("NOT_FOUND", "EMAIL_VERIFICATION_BYPASS_DISABLED")
      }
      const email = (ctx.body as { email?: unknown } | undefined)?.email
      if (typeof email !== "string")
        throw bypassError("FORBIDDEN", "EMAIL_VERIFICATION_BYPASS_NOT_ALLOWED")
      const adapter = ctx.context.internalAdapter
      const found = await adapter.findUserByEmail(email.toLowerCase())
      const user = found?.user as
        (NonNullable<typeof found>["user"] & { accountType?: string }) | undefined
      const registeredMs = user ? Date.now() - new Date(user.createdAt).getTime() : Infinity
      if (
        !user ||
        user.emailVerified ||
        user.accountType !== "ORGANIZER" ||
        registeredMs > EMAIL_VERIFICATION_TTL_SECONDS * 1000
      ) {
        throw bypassError("FORBIDDEN", "EMAIL_VERIFICATION_BYPASS_NOT_ALLOWED")
      }
      const verified = await adapter.updateUser(user.id, { emailVerified: true })
      const session = await adapter.createSession(user.id)
      await setSessionCookie(ctx, { session, user: verified })
      return ctx.json({ status: true })
    }),
  },
  rateLimit: [
    {
      pathMatcher: (path) => path.startsWith(BYPASS_PATH),
      window: 60,
      max: 3,
    },
  ],
})
