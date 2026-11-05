import { Locale } from '@/core/email/locale';
import * as React from 'react';
import {
  EmailAlert,
  EmailFooter,
  EmailHeading,
  EmailLogo,
  EmailShell,
  EmailText,
} from './email-kit';

// Figma (Design system): E20 AUTH_CHANGE_EMAIL_NOTICE · Upozornění na žádost o změnu adresy · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19681-1629 (360 px: node-id=19681-1648; EN: 19681-2063 / 19681-2082)

// Sent to the OLD address when a change of the sign-in e-mail is requested. Only a notice, no action.
// Copy for all locales side by side — a missing translation is a type error. Source: docs/emaily/TEXTY.md.
const copy: Record<
  Locale,
  {
    subject: string;
    preview: string;
    heading: string;
    body: (newEmail: string) => string;
    alertTitle: string;
    alertText: string;
    footer: string[];
  }
> = {
  en: {
    subject: 'Sign-in e-mail change requested in Togena',
    preview: 'The e-mail address change has not yet been completed.',
    heading: 'An e-mail change has been requested',
    body: (newEmail) =>
      `A change of the sign-in e-mail for your Togena account to ${newEmail} has been requested. The change takes effect only after the link sent to the new address is confirmed. Until then, continue using your current address.`,
    alertTitle: 'If you did not request this change',
    alertText: 'Change your Togena password and do not confirm the e-mail change.',
    footer: ['Togena', 'Help with signing in or your account: support@togena.com'],
  },
  cs: {
    subject: 'Žádost o změnu přihlašovacího e-mailu v Togeně',
    preview: 'Změna adresy zatím není dokončená.',
    heading: 'Byla vyžádána změna e-mailu',
    body: (newEmail) =>
      `U vašeho uživatelského účtu v Togeně byla vyžádána změna přihlašovacího e-mailu na ${newEmail}. Změna se provede až po potvrzení odkazu zaslaného na novou adresu. Do té doby se přihlašujete dosavadní adresou.`,
    alertTitle: 'Pokud jste o změnu nežádali',
    alertText:
      'Změňte si heslo ke svému uživatelskému účtu v Togeně a změnu e-mailu nepotvrzujte.',
    footer: ['Togena', 'Pomoc s přihlášením nebo uživatelským účtem: support@togena.com'],
  },
};

export const changeEmailNoticeSubject = (locale: Locale): string => copy[locale].subject;

export interface ChangeEmailNoticeProps {
  locale: Locale;
  newEmail: string;
}

export const ChangeEmailNotice = ({
  locale,
  newEmail,
}: ChangeEmailNoticeProps): React.JSX.Element => {
  const text = copy[locale];
  return (
    <EmailShell locale={locale} preview={text.preview}>
      <EmailLogo />
      <EmailHeading>{text.heading}</EmailHeading>
      <EmailText>{text.body(newEmail)}</EmailText>
      <EmailAlert title={text.alertTitle} description={text.alertText} />
      <EmailFooter lines={text.footer} />
    </EmailShell>
  );
};

// Preview data for `pnpm backend email:dev`.
ChangeEmailNotice.PreviewProps = {
  locale: 'cs',
  newEmail: 'eva.nova@example.cz',
} satisfies ChangeEmailNoticeProps;

export default ChangeEmailNotice;
