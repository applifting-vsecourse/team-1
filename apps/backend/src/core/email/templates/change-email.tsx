import { Locale } from '@/core/email/locale';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from 'react-email';
import * as React from 'react';

// Every template keeps its copy for all locales side by side, so a missing
// translation is a type error, not a silent English e-mail.
// Figma (Design system): US-125 / E-mailová šablona · Ověřovací e-mail · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16244-3444
const copy: Record<
  Locale,
  {
    subject: string;
    heading: string;
    to: string;
    body: (currentEmail: string, newEmail: string) => string;
    button: string;
    ignore: string;
  }
> = {
  en: {
    subject: 'Confirm your e-mail change',
    heading: 'Confirm your e-mail change',
    to: 'To',
    body: (currentEmail, newEmail) =>
      `After you confirm, your sign-in e-mail changes from ${currentEmail} to ${newEmail}.`,
    button: 'Confirm e-mail change',
    ignore: "If you didn't ask for this change, don't use the link.",
  },
  cs: {
    subject: 'Potvrď změnu e-mailu',
    heading: 'Potvrď změnu e-mailu',
    to: 'Komu',
    body: (currentEmail, newEmail) =>
      `Po potvrzení se přihlašovací e-mail změní z ${currentEmail} na ${newEmail}.`,
    button: 'Potvrdit změnu e-mailu',
    ignore: 'Pokud jsi o změnu nežádal, odkaz nepoužívej.',
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
    <Html lang={locale}>
      <Head />
      <Preview>{text.heading}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans py-10">
          <Container className="bg-white rounded-lg mx-auto p-8 max-w-xl">
            <Heading className="text-2xl font-bold text-gray-900 m-0">
              {text.heading}
            </Heading>
            <Text className="text-gray-700 text-sm leading-5 mt-4">
              {text.to}: {newEmail}
            </Text>
            <Text className="text-gray-700 text-base leading-6">
              {text.body(currentEmail, newEmail)}
            </Text>
            <Section className="text-center my-8">
              <Button
                href={url}
                className="bg-gray-900 text-white font-semibold rounded-md px-6 py-3"
              >
                {text.button}
              </Button>
            </Section>
            <Text className="text-gray-700 text-sm leading-5">{text.ignore}</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
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
