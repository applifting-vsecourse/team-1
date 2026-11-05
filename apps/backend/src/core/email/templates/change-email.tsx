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

// Figma (Design system): E19 AUTH_CHANGE_EMAIL_VERIFY · Potvrzení změny adresy · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19681-1573 (360 px: node-id=19681-1601)

// Copy for all locales side by side — a missing translation is a type error. Source: docs/emaily/TEXTY.md.
const copy: Record<
  Locale,
  {
    subject: string;
    preview: string;
    heading: string;
    body: (currentEmail: string, newEmail: string) => string;
    validity: string;
    alertTitle: string;
    alertText: string;
    button: string;
    fallback: string;
    footer: string[];
  }
> = {
  en: {
    subject: 'Confirm your e-mail change in Togena',
    preview: 'Your sign-in e-mail change is awaiting confirmation.',
    heading: 'Confirm your e-mail change',
    body: (currentEmail, newEmail) =>
      `Once confirmed, the sign-in e-mail for your Togena account will change from ${currentEmail} to ${newEmail}. Until then, your current address remains in use.`,
    validity:
      'The link is valid for 1 hour. If it expires, sign in using your current e-mail address and request the e-mail change again in your account settings.',
    alertTitle: 'If you did not request this change',
    alertText: 'Do not use the link.',
    button: 'Confirm e-mail change',
    fallback: "If the button doesn't work, copy this link into your browser:",
    footer: ['Togena', 'Help with signing in or your account: support@togena.com'],
  },
  cs: {
    subject: 'Potvrďte změnu e-mailu v Togeně',
    preview: 'Změna přihlašovací adresy čeká na vaše potvrzení.',
    heading: 'Potvrzení změny e-mailu',
    body: (currentEmail, newEmail) =>
      `Po potvrzení se přihlašovací e-mail vašeho uživatelského účtu v Togeně změní z ${currentEmail} na ${newEmail}. Do té doby platí dosavadní adresa.`,
    validity:
      'Odkaz platí 1 hodinu. Pokud vyprší, přihlaste se dosavadní adresou a změnu e-mailu zadejte znovu v nastavení uživatelského účtu.',
    alertTitle: 'Pokud jste o změnu nežádali',
    alertText: 'Odkaz nepoužívejte.',
    button: 'Potvrdit změnu e-mailu',
    fallback: 'Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:',
    footer: ['Togena', 'Pomoc s přihlášením nebo uživatelským účtem: support@togena.com'],
  },
};

export const changeEmailSubject = (locale: Locale): string => copy[locale].subject;

export interface ChangeEmailProps {
  url: string;
  locale: Locale;
  currentEmail: string;
  newEmail: string;
}

export const ChangeEmail = ({
  url,
  locale,
  currentEmail,
  newEmail,
}: ChangeEmailProps): React.JSX.Element => {
  const text = copy[locale];
  return (
    <EmailShell locale={locale} preview={text.preview}>
      <EmailLogo />
      <EmailHeading>{text.heading}</EmailHeading>
      <EmailText>{text.body(currentEmail, newEmail)}</EmailText>
      <EmailButton href={url}>{text.button}</EmailButton>
      <EmailNote>{text.validity}</EmailNote>
      <EmailAlert title={text.alertTitle} description={text.alertText} />
      <EmailFallbackLink label={text.fallback} url={url} />
      <EmailFooter lines={text.footer} />
    </EmailShell>
  );
};

// Preview data for `pnpm backend email:dev`.
ChangeEmail.PreviewProps = {
  url: 'https://team-1.vsepractical.applifting.dev/api/auth/verify-email?token=preview',
  locale: 'cs',
  currentEmail: 'eva.mala@example.cz',
  newEmail: 'eva.nova@example.cz',
} satisfies ChangeEmailProps;

export default ChangeEmail;
