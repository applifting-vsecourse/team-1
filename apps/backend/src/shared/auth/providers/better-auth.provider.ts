import { EmailService } from "@/core/email/interfaces/email-service.interface"
import { toLocale } from "@/core/email/locale"
import { renderEmail } from "@/core/email/render"
import { ChangeEmail, changeEmailSubject } from "@/core/email/templates/change-email"
import { ResetPassword, resetPasswordSubject } from "@/core/email/templates/reset-password"
import { VerifyEmail, verifyEmailSubject } from "@/core/email/templates/verify-email"
import { PrismaService } from "@/core/prisma/prisma.service"
import { betterAuthCoreConfig } from "@/shared/auth/config/better-auth.config"
import { createMagicLinkPlugin } from "@/shared/auth/magic-link/magic-link.plugin"
import { Config } from "@/shared/config/config.service"
import { Inject, Provider } from "@nestjs/common"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"

/** How long the link that confirms a new e-mail address works. */
export const EMAIL_VERIFICATION_TTL_SECONDS = 60 * 60

const createAuth = (
  prismaService: PrismaService,
  config: Config,
  emailProvider: EmailService,
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
    emailAndPassword: {
      ...betterAuthCoreConfig.emailAndPassword,
      enabled: true,
      // Nobody signs up in sprint 1 (docs/PROJEKT.md): organizers come from the
      // seed, participant accounts from a submitted application. Accounts are
      // created server-side through the internal adapter (see create-user.ts).
      disableSignUp: true,
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
    // A new address is applied only after the link sent to it is clicked (US-125); the
    // old one keeps working until then. The link is a signed token valid for one hour.
    user: {
      ...betterAuthCoreConfig.user,
      changeEmail: { enabled: true },
    },
    emailVerification: {
      expiresIn: EMAIL_VERIFICATION_TTL_SECONDS,
      sendVerificationEmail: async ({ user, url }) => {
        const locale = toLocale((user as { locale?: unknown }).locale)
        // For an e-mail change BetterAuth hands over the user with the NEW address,
        // while the stored one is still the current address.
        const stored = await prismaService.user.findUnique({
          where: { id: user.id },
          select: { email: true },
        })
        if (stored && stored.email !== user.email) {
          const changeHtml = await renderEmail(ChangeEmail, {
            url,
            locale,
            currentEmail: stored.email,
            newEmail: user.email,
          })
          await emailProvider.sendEmail(user.email, changeEmailSubject(locale), changeHtml)
          return
        }
        const html = await renderEmail(VerifyEmail, { url, locale })
        await emailProvider.sendEmail(user.email, verifyEmailSubject(locale), html)
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
  useFactory: (prismaService: PrismaService, config: Config, emailProvider: EmailService) =>
    createAuth(prismaService, config, emailProvider),
  inject: [PrismaService, Config, "EmailService"],
}

export const InjectBetterAuth = Inject("BetterAuth")
