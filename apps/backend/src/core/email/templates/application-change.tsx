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

type ChangeKind =
  | 'STATUS_CHANGED'
  | 'WAITLISTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'TERMS_CHANGED';

// Copy for all locales side by side — a missing translation is a type error.
const copy: Record<
  Locale,
  {
    subject: (event: string) => string;
    preview: string;
    heading: string;
    intro: (name: string, event: string) => string;
    change: Record<ChangeKind, string>;
    termsHeading: string;
    confirmed: string;
    waitlisted: string;
    cancelled: string;
    paymentHeading: string;
    amountChanged: string;
    amountDue: string;
    account: string;
    variableSymbol: string;
    button: string;
    footer: string;
  }
> = {
  en: {
    subject: (event) => `Change in your application: ${event}`,
    preview: 'Something changed in your application',
    heading: 'Your application changed',
    intro: (name, event) =>
      `Hi, there is a change in the application of ${name} for ${event}.`,
    change: {
      STATUS_CHANGED: 'The status of one of the terms changed.',
      WAITLISTED: 'You are a substitute in one of the terms.',
      REJECTED: 'Your application in one of the terms was rejected.',
      CANCELLED: 'The application was cancelled.',
      TERMS_CHANGED: 'The terms of the application changed.',
    },
    termsHeading: 'Status by term now',
    confirmed: 'confirmed',
    waitlisted: 'waiting for confirmation',
    cancelled: 'cancelled',
    paymentHeading: 'Payment',
    amountChanged: 'The amount due changed. Please pay the new amount.',
    amountDue: 'Amount due',
    account: 'Account number',
    variableSymbol: 'Variable symbol',
    button: 'View the application',
    footer: 'You got this e-mail because it is your application.',
  },
  cs: {
    subject: (event) => `Změna ve vaší přihlášce: ${event}`,
    preview: 'V přihlášce došlo ke změně',
    heading: 'Změna přihlášky',
    intro: (name, event) =>
      `Dobrý den, v přihlášce na akci ${event} (${name}) došlo ke změně.`,
    change: {
      STATUS_CHANGED: 'Změnil se stav v jednom z termínů.',
      WAITLISTED: 'V jednom z termínů jste náhradník.',
      REJECTED: 'Vaše přihláška v jednom z termínů byla zamítnuta.',
      CANCELLED: 'Přihláška byla odhlášena.',
      TERMS_CHANGED: 'Změnily se termíny přihlášky.',
    },
    termsHeading: 'Stav podle termínů nyní',
    confirmed: 'potvrzený',
    waitlisted: 'čeká na potvrzení',
    cancelled: 'zrušený',
    paymentHeading: 'Platba',
    amountChanged: 'Změnila se částka k úhradě. Zaplaťte prosím novou částku.',
    amountDue: 'K úhradě',
    account: 'Číslo účtu',
    variableSymbol: 'Variabilní symbol',
    button: 'Zobrazit přihlášku',
    footer: 'Tento e-mail jste dostali, protože jde o vaši přihlášku.',
  },
};

export const applicationChangeSubject = (
  locale: Locale,
  eventName: string,
): string => copy[locale].subject(eventName);

export interface ApplicationChangeProps {
  locale: Locale;
  eventName: string;
  /** First and last name of the participant. */
  name: string;
  kind: ChangeKind;
  terms: { name: string; status: 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED' }[];
  /** Only when the amount due changed; amounts are already formatted. */
  payment: {
    amount: string;
    bankAccount: string;
    variableSymbol: string;
  } | null;
  confirmationUrl: string;
}

export const ApplicationChange = ({
  locale,
  eventName,
  name,
  kind,
  terms,
  payment,
  confirmationUrl,
}: ApplicationChangeProps): React.JSX.Element => {
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
              {text.intro(name, eventName)}
            </Text>
            <Text className="text-gray-900 text-base leading-6 font-semibold">
              {text.change[kind]}
            </Text>

            {terms.length > 0 ? (
              <Section className="mt-4">
                <Text className="text-gray-500 text-sm m-0">
                  {text.termsHeading}
                </Text>
                {terms.map((term) => (
                  <Text
                    key={term.name}
                    className="text-gray-900 text-base leading-6 m-0"
                  >
                    {term.name}:{' '}
                    <strong>
                      {term.status === 'CONFIRMED'
                        ? text.confirmed
                        : term.status === 'WAITLISTED'
                          ? text.waitlisted
                          : text.cancelled}
                    </strong>
                  </Text>
                ))}
              </Section>
            ) : null}

            {payment ? (
              <Section className="mt-4">
                <Text className="text-gray-500 text-sm m-0">
                  {text.paymentHeading}
                </Text>
                <Text className="text-gray-700 text-sm leading-5 m-0 mb-2">
                  {text.amountChanged}
                </Text>
                <Text className="text-gray-900 text-base leading-6 m-0">
                  {text.amountDue}: <strong>{payment.amount}</strong>
                </Text>
                <Text className="text-gray-900 text-base leading-6 m-0">
                  {text.account}: <strong>{payment.bankAccount}</strong>
                </Text>
                <Text className="text-gray-900 text-base leading-6 m-0">
                  {text.variableSymbol}: <strong>{payment.variableSymbol}</strong>
                </Text>
              </Section>
            ) : null}

            <Section className="text-center my-8">
              <Button
                href={confirmationUrl}
                className="bg-gray-900 text-white font-semibold rounded-md px-6 py-3"
              >
                {text.button}
              </Button>
            </Section>
            <Hr className="border-gray-200 my-6" />
            <Text className="text-gray-400 text-xs">{text.footer}</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

// Preview data for `pnpm backend email:dev`: a term was confirmed, the amount changed.
ApplicationChange.PreviewProps = {
  locale: 'cs',
  eventName: 'Letní kemp 2027',
  name: 'Petr Novák',
  kind: 'STATUS_CHANGED',
  terms: [
    { name: '1. týden', status: 'CONFIRMED' },
    { name: '2. týden', status: 'CONFIRMED' },
  ],
  payment: {
    amount: '9 400 Kč',
    bankAccount: '2900123456/2010',
    variableSymbol: '0049',
  },
  confirmationUrl:
    'https://team-1.vsepractical.applifting.dev/apply/confirmation/preview-2',
} satisfies ApplicationChangeProps;

export default ApplicationChange;
