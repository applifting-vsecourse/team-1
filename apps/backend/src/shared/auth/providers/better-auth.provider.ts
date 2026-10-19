import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { toLocale } from '@/core/email/locale';
import { renderEmail } from '@/core/email/render';
import {
  ResetPassword,
  resetPasswordSubject,
} from '@/core/email/templates/reset-password';
import {
  VerifyEmail,
  verifyEmailSubject,
} from '@/core/email/templates/verify-email';
import { PrismaService } from '@/core/prisma/prisma.service';
import { betterAuthCoreConfig } from '@/shared/auth/config/better-auth.config';
import { createMagicLinkPlugin } from '@/shared/auth/magic-link/magic-link.plugin';
import { Config } from '@/shared/config/config.service';
import { Inject, Provider } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

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
      provider: 'postgresql',
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
        const passwordResetUrl = `${config.frontendUrl}/${config.frontendResetPasswordUrl}?token=${token}`;
        // E-mails go out in the account's language (User.locale).
        const locale = toLocale((user as { locale?: unknown }).locale);
        const html = await renderEmail(ResetPassword, {
          username: user.name,
          url: passwordResetUrl,
          locale,
        });
        await emailProvider.sendEmail(
          user.email,
          resetPasswordSubject(locale),
          html,
        );
      },
    },
    trustedOrigins: [config.frontendUrl],
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        const locale = toLocale((user as { locale?: unknown }).locale);
        const html = await renderEmail(VerifyEmail, { url, locale });
        await emailProvider.sendEmail(
          user.email,
          verifyEmailSubject(locale),
          html,
        );
      },
      sendOnSignUp: true,
    },
    plugins: [
      ...(betterAuthCoreConfig.plugins ?? []),
      createMagicLinkPlugin(config, emailProvider),
    ],
  });

export type BetterAuth = ReturnType<typeof createAuth>;

export const betterAuthProvider: Provider = {
  provide: 'BetterAuth',
  useFactory: (
    prismaService: PrismaService,
    config: Config,
    emailProvider: EmailService,
  ) => createAuth(prismaService, config, emailProvider),
  inject: [PrismaService, Config, 'EmailService'],
};

export const InjectBetterAuth = Inject('BetterAuth');
