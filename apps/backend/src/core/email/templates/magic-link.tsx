import { Locale } from '@/core/email/locale';
import * as React from 'react';
import {
  EmailAlert,
  EmailButton,
  EmailFallbackLink,
  EmailFooter,
  EmailHeading,
  EmailLogo,
  EmailNote,
  EmailShell,
  EmailText,
} from './email-kit';

// Figma (Design system): E17 AUTH_MAGIC_LINK · Přihlašovací odkaz · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19681-1461 (360 px: node-id=19681-1491)

// Copy for all locales side by side — a missing translation is a type error. Source: docs/emaily/TEXTY.md.
const copy: Record<
  Locale,
  {
    subject: string;
    preview: string;
    heading: string;
    body: string;
    validity: string;
    alertTitle: string;
    alertText: string;
    button: string;
    fallback: string;
    footer: string[];
  }
> = {
  en: {
    subject: 'Your sign-in link for Togena',
    preview: 'Use the link in this e-mail to sign in.',
    heading: 'Sign in to Togena',
    body: 'A sign-in link for Togena was requested for this e-mail address. Use the button below to sign in. Do not forward this link to anyone.',
    validity:
      'The link is valid for 7 days and can only be used once. If it no longer works, you can request a new one on the Togena sign-in page.',
    alertTitle: 'If you did not request this link',
    alertText: 'Do not use it.',
    button: 'Sign in to Togena',
    fallback: "If the button doesn't work, copy this link into your browser:",
    footer: ['Togena', 'Help with signing in or your account: support@togena.com'],
  },
  cs: {
    subject: 'Odkaz pro přihlášení do Togeny',
    preview: 'Přihlaste se pomocí odkazu v tomto e-mailu.',
    heading: 'Přihlášení do Togeny',
    body: 'O přihlášení do Togeny bylo požádáno pro tuto e-mailovou adresu. Přihlaste se tlačítkem níže. Odkaz nikomu nepřeposílejte.',
    validity:
      'Odkaz platí 7 dní a lze jej použít pouze jednou. Pokud už nefunguje, na přihlašovací stránce Togeny si můžete nechat poslat nový.',
    alertTitle: 'Pokud jste o přihlášení nežádali',
    alertText: 'Odkaz nepoužívejte.',
    button: 'Přihlásit se do Togeny',
    fallback: 'Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:',
    footer: ['Togena', 'Pomoc s přihlášením nebo uživatelským účtem: support@togena.com'],
  },
};

export const magicLinkSubject = (locale: Locale): string => copy[locale].subject;

export interface MagicLinkProps {
  url: string;
  locale: Locale;
}

export const MagicLink = ({ url, locale }: MagicLinkProps): React.JSX.Element => {
  const text = copy[locale];
  return (
    <EmailShell locale={locale} preview={text.preview}>
      <EmailLogo />
      <EmailHeading>{text.heading}</EmailHeading>
      <EmailText>{text.body}</EmailText>
      <EmailButton href={url}>{text.button}</EmailButton>
      <EmailNote>{text.validity}</EmailNote>
      <EmailAlert title={text.alertTitle} description={text.alertText} />
      <EmailFallbackLink label={text.fallback} url={url} />
      <EmailFooter lines={text.footer} />
    </EmailShell>
  );
};

// Preview data for `pnpm backend email:dev`.
MagicLink.PreviewProps = {
  url: 'https://team-1.vsepractical.applifting.dev/participant/magic-link?token=preview',
  locale: 'cs',
} satisfies MagicLinkProps;

export default MagicLink;
