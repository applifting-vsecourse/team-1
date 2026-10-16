import { Locale } from '@/core/email/locale';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from 'react-email';
import * as React from 'react';

// Every template keeps its copy for all locales side by side, so a missing
// translation is a type error, not a silent English e-mail.
const copy: Record<
  Locale,
  {
    subject: string;
    preview: string;
    heading: string;
    body: (name: string) => string;
    button: string;
    fallback: string;
    ignore: string;
  }
> = {
  en: {
    subject: 'Password reset',
    preview: 'Reset your Togena password',
    heading: 'Reset your password',
    body: (name) =>
      `Hi ${name}, we received a request to reset your Togena password. Click the button below to choose a new one.`,
    button: 'Choose a new password',
    fallback: "If the button doesn't work, copy this link into your browser:",
    ignore:
      "If you didn't ask for a password reset, ignore this e-mail — your password stays the same.",
  },
  cs: {
    subject: 'Obnova hesla',
    preview: 'Obnova hesla do Togeny',
    heading: 'Obnova hesla',
    body: (name) =>
      `Ahoj ${name}, dostali jsme žádost o obnovu hesla do Togeny. Nové heslo si nastavíš kliknutím na tlačítko níže.`,
    button: 'Nastavit nové heslo',
    fallback: 'Pokud tlačítko nefunguje, zkopíruj tento odkaz do prohlížeče:',
    ignore:
      'Pokud jsi o obnovu hesla nežádal(a), tento e-mail ignoruj — heslo zůstane stejné.',
  },
};

export const resetPasswordSubject = (locale: Locale): string => copy[locale].subject;

export interface ResetPasswordProps {
  username: string;
  url: string;
  locale: Locale;
}

export const ResetPassword = ({
  username,
  url,
  locale,
}: ResetPasswordProps): React.JSX.Element => {
  const text = copy[locale];
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{text.preview}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans py-10">
          <Container className="bg-white rounded-lg mx-auto p-8 max-w-xl">
            <Heading className="text-2xl font-bold text-gray-900 m-0">
              {text.heading}
            </Heading>
            <Text className="text-gray-700 text-base leading-6 mt-4">
              {text.body(username)}
            </Text>
            <Section className="text-center my-8">
              <Button
                href={url}
                className="bg-gray-900 text-white font-semibold rounded-md px-6 py-3"
              >
                {text.button}
              </Button>
            </Section>
            <Text className="text-gray-600 text-sm leading-5">
              {text.fallback}
            </Text>
            <Text className="text-blue-600 text-sm break-all">{url}</Text>
            <Hr className="border-gray-200 my-6" />
            <Text className="text-gray-400 text-xs">{text.ignore}</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

// Preview data for `pnpm backend email:dev`.
ResetPassword.PreviewProps = {
  username: 'Jana',
  url: 'https://team-1.vsepractical.applifting.dev/reset-password?token=preview',
  locale: 'cs',
} satisfies ResetPasswordProps;

export default ResetPassword;
