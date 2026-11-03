import { Locale } from '@/core/email/locale';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Tailwind,
  Text,
} from 'react-email';
import * as React from 'react';

// Every template keeps its copy for all locales side by side, so a missing
// translation is a type error, not a silent English e-mail.
// Sent to the OLD address when a change of the sign-in e-mail is requested (US-125, security).
const copy: Record<
  Locale,
  {
    subject: string;
    heading: string;
    body: (newEmail: string) => string;
    ignore: string;
  }
> = {
  en: {
    subject: 'A change of your sign-in e-mail was requested',
    heading: 'A change of your sign-in e-mail was requested',
    body: (newEmail) =>
      `Someone asked to change the sign-in e-mail of your Togena account to ${newEmail}. The change takes effect only after the link sent to that address is confirmed; until then you keep signing in with this e-mail.`,
    ignore:
      "If it wasn't you, change your password and don't confirm anything.",
  },
  cs: {
    subject: 'Byla požádána změna přihlašovacího e-mailu',
    heading: 'Byla požádána změna přihlašovacího e-mailu',
    body: (newEmail) =>
      `Někdo požádal o změnu přihlašovacího e-mailu tvého účtu v Togeně na ${newEmail}. Změna začne platit až po potvrzení odkazu zaslaného na tuto adresu; do té doby se přihlašuješ tímto e-mailem.`,
    ignore: 'Pokud jsi to nebyl ty, změň si heslo a nic nepotvrzuj.',
  },
};

export const changeEmailNoticeSubject = (locale: Locale): string =>
  copy[locale].subject;

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
    <Html lang={locale}>
      <Head />
      <Preview>{text.heading}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans py-10">
          <Container className="bg-white rounded-lg mx-auto p-8 max-w-xl">
            <Heading className="text-2xl font-bold text-gray-900 m-0">
              {text.heading}
            </Heading>
            <Text className="text-gray-700 text-base leading-6 mt-4">
              {text.body(newEmail)}
            </Text>
            <Text className="text-gray-700 text-sm leading-5">
              {text.ignore}
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

// Preview data for `pnpm backend email:dev`.
ChangeEmailNotice.PreviewProps = {
  locale: 'cs',
  newEmail: 'eva.nova@example.cz',
} satisfies ChangeEmailNoticeProps;

export default ChangeEmailNotice;
