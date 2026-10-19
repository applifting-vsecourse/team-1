import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { toLocale } from '@/core/email/locale';
import { renderEmail } from '@/core/email/render';
import { MagicLink, magicLinkSubject } from '@/core/email/templates/magic-link';
import {
  MAGIC_LINK_TTL_SECONDS,
  magicLinkCapture,
  magicLinkLandingUrl,
} from '@/shared/auth/magic-link/magic-link.shared';
import { Config } from '@/shared/config/config.service';
import type { BetterAuthPlugin } from 'better-auth';
import { magicLink } from 'better-auth/plugins';

export const createMagicLinkPlugin = (
  config: Config,
  emailProvider: EmailService,
  // Annotated: the plugin's inferred type names zod internals that cannot be
  // referenced portably from this package.
): BetterAuthPlugin =>
  magicLink({
    expiresIn: MAGIC_LINK_TTL_SECONDS,
    // A link never creates an account — accounts come from a submitted application.
    disableSignUp: true,
    sendMagicLink: async ({ email, token, metadata }, ctx) => {
      const requestId =
        typeof metadata?.requestId === 'string' ? metadata.requestId : null;
      const adapter = ctx?.context.internalAdapter;
      const found = await adapter?.findUserByEmail(email);
      const user = found?.user as
        { accountType?: string; locale?: unknown } | undefined;

      // The endpoint is public, so the type check happens here: only a
      // participant ever receives a link. Everything else gets the same
      // answer as a participant (no way to probe which e-mails exist), the
      // token is dropped and nothing is sent.
      if (user?.accountType !== 'PARTICIPANT') {
        await adapter?.deleteVerificationByIdentifier(token);
        magicLinkCapture.publish(requestId, null);
        return;
      }

      const url = magicLinkLandingUrl(config.frontendUrl, token);
      if (magicLinkCapture.publish(requestId, url)) return;

      const locale = toLocale(user.locale);
      const html = await renderEmail(MagicLink, {
        url,
        locale,
      });
      await emailProvider.sendEmail(email, magicLinkSubject(locale), html);
    },
  });
