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
    body: string;
    button: string;
    fallback: string;
    ignore: string;
  }
> = {
  en: {
    subject: 'Verify your e-mail address',
    preview: 'Verify your e-mail for Togena',
    heading: 'Welcome to Togena',
    body: 'Tap the button below to verify your e-mail address and finish setting up your account.',
    button: 'Verify e-mail',
    fallback: "If the button doesn't work, copy this link into your browser:",
    ignore: "If you didn't create a Togena account, you can ignore this e-mail.",
  },
  cs: {
    subject: 'Ověření e-mailové adresy',
    preview: 'Ověř svůj e-mail pro Togenu',
    heading: 'Vítej v Togeně',
    body: 'Kliknutím na tlačítko níže ověříš svou e-mailovou adresu a dokončíš založení účtu.',
    button: 'Ověřit e-mail',
    fallback: 'Pokud tlačítko nefunguje, zkopíruj tento odkaz do prohlížeče:',
    ignore: 'Pokud sis účet v Togeně nezakládal(a), tento e-mail ignoruj.',
  },
};

export const verifyEmailSubject = (locale: Locale): string => copy[locale].subject;

export interface VerifyEmailProps {
  url: string;
  locale: Locale;
}

export const VerifyEmail = ({
  url,
  locale,
}: VerifyEmailProps): React.JSX.Element => {
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
              {text.body}
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
VerifyEmail.PreviewProps = {
  url: 'https://team-1.vsepractical.applifting.dev/api/auth/verify-email?token=preview',
  locale: 'cs',
} satisfies VerifyEmailProps;

export default VerifyEmail;
