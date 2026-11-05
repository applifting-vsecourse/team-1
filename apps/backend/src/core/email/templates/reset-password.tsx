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

// Figma (Design system): E18 AUTH_RESET_PASSWORD · Obnova hesla · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19681-1519 (360 px: node-id=19681-1546)

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
    subject: 'Reset your Togena password',
    preview: 'Use the link in this e-mail to choose a new password.',
    heading: 'Choose a new password',
    body: 'We have received a request to reset the password for your Togena account. Use the button below to choose a new password. The link is valid for 1 hour.',
    alertTitle: 'If you did not request a password reset',
    alertText: 'Ignore this e-mail. This e-mail does not change your password.',
    button: 'Choose a new password',
    fallback: "If the button doesn't work, copy this link into your browser:",
    footer: ['Togena', 'Help with signing in or your account: support@togena.com'],
  },
  cs: {
    subject: 'Obnova hesla do Togeny',
    preview: 'Nastavte si nové heslo pomocí odkazu v tomto e-mailu.',
    heading: 'Nastavení nového hesla',
    body: 'Obdrželi jsme žádost o obnovu hesla k vašemu uživatelskému účtu v Togeně. Nové heslo si nastavíte tlačítkem níže. Odkaz platí 1 hodinu.',
    alertTitle: 'Pokud jste o obnovu nežádali',
    alertText: 'Tento e-mail ignorujte. Vaše heslo se tímto e-mailem nemění.',
    button: 'Nastavit nové heslo',
    fallback: 'Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:',
    footer: ['Togena', 'Pomoc s přihlášením nebo uživatelským účtem: support@togena.com'],
  },
};

export const resetPasswordSubject = (locale: Locale): string => copy[locale].subject;

export interface ResetPasswordProps {
  url: string;
  locale: Locale;
}

export const ResetPassword = ({ url, locale }: ResetPasswordProps): React.JSX.Element => {
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
ResetPassword.PreviewProps = {
  url: 'https://team-1.vsepractical.applifting.dev/reset-password?token=preview',
  locale: 'cs',
} satisfies ResetPasswordProps;

export default ResetPassword;
