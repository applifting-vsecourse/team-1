import { EmailService } from "@/core/email/interfaces/email-service.interface"
import { toLocale } from "@/core/email/locale"
import { renderEmail } from "@/core/email/render"
import { ChangeEmail, changeEmailSubject } from "@/core/email/templates/change-email"
import { ResetPassword, resetPasswordSubject } from "@/core/email/templates/reset-password"
import { VerifyEmail, verifyEmailSubject } from "@/core/email/templates/verify-email"
import { PrismaService } from "@/core/prisma/prisma.service"
import { betterAuthCoreConfig } from "@/shared/auth/config/better-auth.config"
import { emailChangeHooks } from "@/shared/auth/email-change/email-change-hooks"
import { verificationDelivery } from "@/shared/auth/email-change/verification-delivery"
import { createMagicLinkPlugin } from "@/shared/auth/magic-link/magic-link.plugin"
import { AuthUserRepository } from "@/shared/auth/repositories/auth-user.repository"
import { Config } from "@/shared/config/config.service"
import { AUTH_RATE_LIMIT_RULES } from "@/shared/rate-limit/rate-limits"
import { TRUSTED_PROXIES } from "@/shared/rate-limit/trusted-proxies"
import { Inject, Provider } from "@nestjs/common"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"

/** How long the link that confirms a new e-mail address works. */
export const EMAIL_VERIFICATION_TTL_SECONDS = 60 * 60

const createAuth = (
  prismaService: PrismaService,
  config: Config,
  emailProvider: EmailService,
  authUsers: AuthUserRepository,
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) =>
  betterAuth({
    // Without this better-auth can only guess its own URL from the request,
    // which breaks callbacks and links built outside a request (e.g. the seed).
    baseURL: config.backendUrl,
    database: prismaAdapter(prismaService, {
      provider: "postgresql",
    }),
    // If change (setup) affects database, must be in core config, in order to be able to run migrations.
    // Spread first: anything below extends it. Spread last, it replaced the whole
    // `emailAndPassword` object and silently dropped `sendResetPassword`.
    ...betterAuthCoreConfig,
    databaseHooks: {
      user: {
        create: {
          before: async (user, context) => {
            if (context?.path !== "/sign-up/email") return
            const preferred = context.request?.headers.get("accept-language")?.split(",")[0]
            return { data: { ...user, locale: toLocale(preferred) } }
          },
        },
      },
    },
    emailAndPassword: {
      ...betterAuthCoreConfig.emailAndPassword,
      enabled: true,
      // Public sign-up creates only organizers (the accountType field is
      // server-owned). Participants still come from a submitted application.
      disableSignUp: false,
      sendResetPassword: async ({ user, token }) => {
        const passwordResetUrl = `${config.frontendUrl}/${config.frontendResetPasswordUrl}?token=${token}`
        // E-mails go out in the account's language (User.locale).
        const locale = toLocale((user as { locale?: unknown }).locale)
        const html = await renderEmail(ResetPassword, {
          username: user.name,
          url: passwordResetUrl,
          locale,
        })
        await emailProvider.sendEmail(user.email, resetPasswordSubject(locale), html)
      },
    },
    // Sliding session: it ends after 7 days without a visit and is extended at
    // most once a day while in use. Sessions signed in without "remember me"
    // last only 24 h and are never extended, so sign-in always remembers.
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    trustedOrigins: [config.frontendUrl],
    // #294: BetterAuth's defaults (e.g. 3 sign-ins in 10 s) plus our own rules,
    // on in every environment unless RATE_LIMIT_ENABLED=false. Over the limit it
    // answers 429; the frontend translates it as TOO_MANY_REQUESTS.
    rateLimit: {
      enabled: config.rateLimitEnabled,
      customRules: AUTH_RATE_LIMIT_RULES,
    },
    // The client is the rightmost X-Forwarded-For address that is not our proxy.
    // Without trusted proxies BetterAuth ignores a header with several addresses,
    // which on staging (Traefik appends the client) would switch the limit off.
    advanced: {
      ipAddress: { trustedProxies: [...TRUSTED_PROXIES] },
    },
    // A new address is applied only after the link sent to it is clicked (US-125); the
    // old one keeps working until then. The link is a signed token valid for one hour.
    user: {
      ...betterAuthCoreConfig.user,
      changeEmail: { enabled: true },
    },
    emailVerification: {
      expiresIn: EMAIL_VERIFICATION_TTL_SECONDS,
      autoSignInAfterVerification: true,
      // The applications module moves the contact e-mail of the account's applications (PO, #218).
      afterEmailVerification: async (user) => {
        await emailChangeHooks.publish({ id: user.id, email: user.email })
      },
      sendVerificationEmail: async ({ user, url }) => {
        try {
          const locale = toLocale((user as { locale?: unknown }).locale)
          // For an e-mail change BetterAuth hands over the user with the NEW address,
          // while the stored one is still the current address.
          const storedEmail = await authUsers.findEmail(user.id)
          if (storedEmail && storedEmail !== user.email) {
            const changeHtml = await renderEmail(ChangeEmail, {
              url,
              locale,
              currentEmail: storedEmail,
              newEmail: user.email,
            })
            await emailProvider.sendEmail(user.email, changeEmailSubject(locale), changeHtml)
            return
          }
          const html = await renderEmail(VerifyEmail, { url, locale })
          await emailProvider.sendEmail(user.email, verifyEmailSubject(locale), html)
        } catch (error) {
          // BetterAuth swallows this error; the e-mail change request reads the flag.
          const delivery = verificationDelivery.getStore()
          if (delivery) delivery.isFailed = true
          throw error
        }
      },
      sendOnSignUp: true,
    },
    plugins: [
      ...(betterAuthCoreConfig.plugins ?? []),
      createMagicLinkPlugin(config, emailProvider),
    ],
  })

export type BetterAuth = ReturnType<typeof createAuth>

export const betterAuthProvider: Provider = {
  provide: "BetterAuth",
  useFactory: (
    prismaService: PrismaService,
    config: Config,
    emailProvider: EmailService,
    authUsers: AuthUserRepository,
  ) => createAuth(prismaService, config, emailProvider, authUsers),
  inject: [PrismaService, Config, "EmailService", AuthUserRepository],
}

export const InjectBetterAuth = Inject("BetterAuth")
