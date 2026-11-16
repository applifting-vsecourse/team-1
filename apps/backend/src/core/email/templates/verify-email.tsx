import { Locale } from '@/core/email/locale';
import * as React from 'react';
import {
  EmailAlert,
  EmailButton,
  EmailFallbackLink,
  EmailFooter,
  EmailHeading,
  EmailLogo,
  EmailShell,
  EmailText,
} from './email-kit';

// Figma: chybí, doplní designér (AUTH_VERIFY_EMAIL, ověření e-mailu při registraci organizátora, US-69; D-105 se týká jen přihlašovatelů)

// Copy for all locales side by side — a missing translation is a type error. Source: docs/emaily/TEXTY.md.
const copy: Record<
  Locale,
  {
    subject: string;
    preview: string;
    heading: string;
    body: string;
    alertTitle: string;
    alertText: string;
    button: string;
    fallback: string;
    footer: string[];
  }
> = {
  en: {
    subject: 'Confirm your email for Togena',
    preview: 'Use the link in this e-mail to confirm your e-mail address.',
    heading: 'Confirm your e-mail address',
    body: 'Thank you for registering your organization in Togena. Use the button below to confirm your e-mail address. The link is valid for 1 hour.',
    alertTitle: 'If you did not register',
    alertText: 'Ignore this e-mail. Nothing happens until you confirm your address.',
    button: 'Confirm e-mail',
    fallback: "If the button doesn't work, copy this link into your browser:",
    footer: ['Togena', 'Help with signing in or your account: support@togena.com'],
  },
  cs: {
    subject: 'Potvrďte svůj e-mail v Togeně',
    preview: 'Potvrďte svou e-mailovou adresu pomocí odkazu v tomto e-mailu.',
    heading: 'Potvrzení e-mailové adresy',
    body: 'Děkujeme za registraci vaší organizace v Togeně. Svou e-mailovou adresu potvrdíte tlačítkem níže. Odkaz platí 1 hodinu.',
    alertTitle: 'Pokud jste se neregistrovali',
    alertText: 'Tento e-mail ignorujte. Dokud adresu nepotvrdíte, nic se nestane.',
    button: 'Potvrdit e-mail',
    fallback: 'Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:',
    footer: ['Togena', 'Pomoc s přihlášením nebo uživatelským účtem: support@togena.com'],
  },
};

export const verifyEmailSubject = (locale: Locale): string => copy[locale].subject;

export interface VerifyEmailProps {
  url: string;
  locale: Locale;
}

export const VerifyEmail = ({ url, locale }: VerifyEmailProps): React.JSX.Element => {
  const text = copy[locale];
  return (
    <EmailShell locale={locale} preview={text.preview}>
      <EmailLogo />
      <EmailHeading>{text.heading}</EmailHeading>
      <EmailText>{text.body}</EmailText>
      <EmailButton href={url}>{text.button}</EmailButton>
      <EmailAlert title={text.alertTitle} description={text.alertText} />
      <EmailFallbackLink label={text.fallback} url={url} />
      <EmailFooter lines={text.footer} />
    </EmailShell>
  );
};

// Preview data for `pnpm backend email:dev`.
VerifyEmail.PreviewProps = {
  url: 'https://team-1.vsepractical.applifting.dev/verify-email?token=preview',
  locale: 'cs',
} satisfies VerifyEmailProps;

export default VerifyEmail;
