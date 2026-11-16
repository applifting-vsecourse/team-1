import { createHash, randomBytes } from "node:crypto"
import { Config } from "@/shared/config/config.service"
import type { BetterAuthPlugin } from "better-auth"
import { createAuthEndpoint, createAuthMiddleware } from "better-auth/api"
import { setSessionCookie } from "better-auth/cookies"

/** How long the token handed out at registration works. */
export const BYPASS_TOKEN_TTL_MS = 15 * 60 * 1000

/**
 * How long after registering the password can replace an expired token. A registration made while
 * the bypass was off (or earlier than this) has no such window, so its account cannot be verified
 * this way.
 */
export const BYPASS_REGISTRATION_WINDOW_MS = 60 * 60 * 1000

/** Body key the sign-up response carries the token in (only while the bypass is on). */
export const BYPASS_TOKEN_FIELD = "emailVerificationBypassToken"

const registrationIdentifierOf = (userId: string): string =>
  `email-verification-bypass-registration:${userId}`

const identifierOf = (token: string): string =>
  `email-verification-bypass:${createHash("sha256").update(token).digest("hex")}`

/** What the server-only endpoint answers; the controller turns a refusal into an AppException. */
export type BypassOutcome = { status: "verified" } | { status: "refused" }

/**
 * Staging and demo only: environments without a verified sender domain cannot deliver the
 * verification link, so the organizer could never finish registration. While
 * EMAIL_VERIFICATION_BYPASS_ENABLED is on, the sign-up response carries a one-time token bound
 * to that registration (stored hashed, valid 15 minutes). Handing the token back marks that
 * account verified and signs it in. If the token has expired, the password of the registration
 * is the alternative proof, but only within an hour of a registration made in bypass mode. Without either nothing can be verified, so neither a foreign account
 * nor an e-mail change (which keeps a verified account) goes through it.
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
          // Marks a registration made in bypass mode; only such an account may continue with its
          // password once the token has expired, and only within the window.
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: registrationIdentifierOf(userId),
            value: userId,
            expiresAt: new Date(Date.now() + BYPASS_REGISTRATION_WINDOW_MS),
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
        const { token, email, password } = (ctx.body ?? {}) as Record<string, unknown>
        const adapter = ctx.context.internalAdapter
        let user: Awaited<ReturnType<typeof adapter.findUserById>> | null = null
        if (typeof token === "string") {
          // Single use: the row is consumed (and an expired one dropped) in one step.
          const row = await adapter.consumeVerificationValue(identifierOf(token))
          user = row ? await adapter.findUserById(row.value) : null
        } else if (typeof email === "string" && typeof password === "string") {
          // The token expired or was lost: the password of the registration proves ownership.
          const found = await adapter.findUserByEmail(email.toLowerCase(), {
            includeAccounts: true,
          })
          const hash = found?.accounts.find(
            (account) => account.providerId === "credential" && account.accountId === found.user.id,
          )?.password
          const registration = found
            ? await adapter.findVerificationValue(registrationIdentifierOf(found.user.id))
            : null
          const isOpen = Boolean(registration && registration.expiresAt.getTime() > Date.now())
          // Do the same expensive hashing work for an unknown account or one without a password
          // (as BetterAuth's own sign-in does), so the response time does not reveal which
          // e-mails are registered.
          let isOwner = false
          if (hash) isOwner = await ctx.context.password.verify({ hash, password })
          else await ctx.context.password.hash(password)
          user = isOwner && isOpen ? (found?.user ?? null) : null
        }
        const accountType = (user as { accountType?: string } | null)?.accountType
        if (!user || user.emailVerified || accountType !== "ORGANIZER") return { status: "refused" }
        const verified = await adapter.updateUser(user.id, { emailVerified: true })
        // The registration is finished: neither the window nor a leftover token stays usable.
        await adapter.deleteVerificationByIdentifier(registrationIdentifierOf(user.id))
        const session = await adapter.createSession(user.id)
        await setSessionCookie(ctx, { session, user: verified })
        return { status: "verified" }
      },
    ),
  },
})
