import { createHash, randomBytes } from "node:crypto"
import { Config } from "@/shared/config/config.service"
import type { BetterAuthPlugin } from "better-auth"
import { createAuthEndpoint, createAuthMiddleware } from "better-auth/api"
import { setSessionCookie } from "better-auth/cookies"

/** How long the token handed out at registration works. */
export const BYPASS_TOKEN_TTL_MS = 15 * 60 * 1000

/** Body key the sign-up response carries the token in (only while the bypass is on). */
export const BYPASS_TOKEN_FIELD = "emailVerificationBypassToken"

const identifierOf = (token: string): string =>
  `email-verification-bypass:${createHash("sha256").update(token).digest("hex")}`

/** What the server-only endpoint answers; the controller turns a refusal into an AppException. */
export type BypassOutcome = { status: "verified" } | { status: "refused" }

/**
 * Staging and demo only: environments without a verified sender domain cannot deliver the
 * verification link, so the organizer could never finish registration. While
 * EMAIL_VERIFICATION_BYPASS_ENABLED is on, the sign-up response carries a one-time token bound
 * to that registration (stored hashed, valid 15 minutes). Handing the token back marks that
 * account verified and signs it in. Without the token nothing can be verified, so neither a
 * foreign account nor an e-mail change (which keeps a verified account) goes through it.
 *
 * The endpoint is server-only (not routed under /api/auth): the Nest controller calls it, so
 * errors leave through the common AppException filter.
 */
export const createEmailVerificationBypassPlugin = (config: Config): BetterAuthPlugin => ({
  id: "email-verification-bypass",
  hooks: {
    after: [
      {
        matcher: (context) => context.path === "/sign-up/email",
        handler: createAuthMiddleware(async (ctx) => {
          if (!config.emailVerificationBypassEnabled) return
          const returned = ctx.context.returned as { user?: { id?: unknown } } | undefined
          const userId = returned?.user?.id
          if (typeof userId !== "string") return
          const token = randomBytes(32).toString("base64url")
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: identifierOf(token),
            value: userId,
            expiresAt: new Date(Date.now() + BYPASS_TOKEN_TTL_MS),
          })
          return ctx.json({ ...returned, [BYPASS_TOKEN_FIELD]: token })
        }),
      },
    ],
  },
  endpoints: {
    emailVerificationBypass: createAuthEndpoint(
      "/email-verification-bypass",
      { method: "POST", metadata: { SERVER_ONLY: true } },
      async (ctx): Promise<BypassOutcome> => {
        const token = (ctx.body as { token?: unknown } | undefined)?.token
        if (typeof token !== "string") return { status: "refused" }
        const adapter = ctx.context.internalAdapter
        // Single use: the row is consumed (and an expired one dropped) in one step.
        const row = await adapter.consumeVerificationValue(identifierOf(token))
        const user = row ? await adapter.findUserById(row.value) : null
        const accountType = (user as { accountType?: string } | null)?.accountType
        if (!user || user.emailVerified || accountType !== "ORGANIZER") return { status: "refused" }
        const verified = await adapter.updateUser(user.id, { emailVerified: true })
        const session = await adapter.createSession(user.id)
        await setSessionCookie(ctx, { session, user: verified })
        return { status: "verified" }
      },
    ),
  },
})
