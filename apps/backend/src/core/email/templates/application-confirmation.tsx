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

// Figma (Design system): US-102 E-mailová šablona · Souhrnný e-mail (K vyhodnocení) · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15751-2063 (360 px: node-id=15751-2100)
// Copy for all locales side by side — a missing translation is a type error.
const copy: Record<
  Locale,
  {
    subject: (event: string) => string;
    preview: string;
    heading: string;
    intro: (event: string) => string;
    termsHeading: string;
    confirmed: string;
    toEvaluate: string;
    toEvaluateNote: string;
    toEvaluateAlertTitle: string;
    toEvaluateAlertText: string;
    waitlisted: string;
    paymentHeading: string;
    amountDue: string;
    account: string;
    variableSymbol: string;
    payTermsHeading: string;
    severalPayments: string;
    waitlistNote: string;
    allWaitlisted: string;
    statusLink: string;
    magicLinkText: string;
    magicLinkButton: string;
    loginText: string;
    loginButton: string;
    fallback: string;
    footer: string;
  }
> = {
  en: {
    subject: (event) => `Your application: ${event}`,
    preview: 'Status of your terms and payment details',
    heading: 'Application received',
    intro: (event) => `Hi, we received your application for ${event}.`,
    termsHeading: 'Status by term',
    confirmed: 'confirmed',
    toEvaluate: 'Awaiting evaluation',
    toEvaluateNote:
      'The organizer will review the application in each term separately. It is not a confirmed place or a waitlist spot yet.',
    toEvaluateAlertTitle: "Don't pay yet.",
    toEvaluateAlertText:
      'You will get the payment details once your participation is confirmed.',
    waitlisted: 'you are waitlisted',
    paymentHeading: 'Payment',
    amountDue: 'Amount due',
    account: 'Account number',
    variableSymbol: 'Variable symbol',
    payTermsHeading: 'Or pay one term only (its own variable symbol)',
    severalPayments:
      'Every application has its own variable symbol — please pay each one separately.',
    waitlistNote:
      "Don't pay for a term where you are waitlisted. You pay once the place is confirmed.",
    allWaitlisted:
      "None of your terms is confirmed yet, so there is nothing to pay. You pay only after a place is confirmed — we'll send you the payment details then.",
    statusLink: 'View the status of this application',
    magicLinkText:
      'You can come back to your applications any time. The button signs you in and lets you choose a password. The link works once and is valid for 7 days.',
    magicLinkButton: 'Open my applications',
    loginText: 'You can come back to your applications by signing in with your e-mail and password.',
    loginButton: 'Sign in',
    fallback: "If the button doesn't work, copy this link into your browser:",
    footer: 'You got this e-mail because an application was submitted with your address.',
  },
  cs: {
    subject: (event) => `Potvrzení přihlášky: ${event}`,
    preview: 'Stav termínů a platební údaje',
    heading: 'Přihláška přijata',
    intro: (event) => `Dobrý den, přijali jsme vaši přihlášku na akci ${event}.`,
    termsHeading: 'Stav podle termínů',
    confirmed: 'potvrzený',
    toEvaluate: 'Čeká na vyhodnocení',
    toEvaluateNote:
      'Organizátor přihlášku posoudí v každém termínu zvlášť. Zatím nejde o potvrzenou účast ani o zařazení mezi náhradníky.',
    toEvaluateAlertTitle: 'Zatím nic neplaťte.',
    toEvaluateAlertText: 'Platební údaje dostanete po potvrzení účasti.',
    waitlisted: 'jste náhradník',
    paymentHeading: 'Platba',
    amountDue: 'K úhradě',
    account: 'Číslo účtu',
    variableSymbol: 'Variabilní symbol',
    payTermsHeading: 'Nebo zaplaťte jen jeden termín (vlastní variabilní symbol)',
    severalPayments:
      'Každá přihláška má vlastní variabilní symbol, platby posílejte zvlášť.',
    waitlistNote:
      'Za termín, kde jste náhradník, zatím neplaťte. Platíte až po potvrzení místa.',
    allWaitlisted:
      'Žádný termín zatím není potvrzený, takže zatím nic neplaťte. Platíte až po potvrzení místa, platební údaje vám pak pošleme.',
    statusLink: 'Zobrazit stav této přihlášky',
    magicLinkText:
      'K přihláškám se můžete kdykoliv vrátit. Tlačítkem se přihlásíte a nastavíte si heslo. Odkaz jde použít jednou a platí 7 dní.',
    magicLinkButton: 'Otevřít moje přihlášky',
    loginText: 'K přihláškám se vrátíte přihlášením svým e-mailem a heslem.',
    loginButton: 'Přihlásit se',
    fallback: 'Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:',
    footer: 'Tento e-mail jste dostali, protože byla odeslána přihláška na vaši adresu.',
  },
};

export const applicationConfirmationSubject = (
  locale: Locale,
  eventName: string,
): string => copy[locale].subject(eventName);

export interface ConfirmationApplicationProps {
  /** First and last name of the participant. */
  name: string;
  terms: { name: string; status: 'TO_EVALUATE' | 'CONFIRMED' | 'WAITLISTED' }[];
  /** Only for an application with a confirmed term; amounts are already formatted. */
  payment: {
    /** Everything due now, paid under the summary variable symbol (`…000`). */
    amount: string;
    bankAccount: string;
    variableSymbol: string;
    /** One line per confirmed term with its own symbol; empty with a single confirmed term. */
    terms: { name: string; amount: string; variableSymbol: string }[];
  } | null;
  confirmationUrl: string;
}

export interface ApplicationConfirmationProps {
  locale: Locale;
  eventName: string;
  /** Magic link (account without a password) or the sign-in page. */
  access: { kind: 'MAGIC_LINK' | 'LOGIN'; url: string };
  applications: ConfirmationApplicationProps[];
}

export const ApplicationConfirmation = ({
  locale,
  eventName,
  access,
  applications,
}: ApplicationConfirmationProps): React.JSX.Element => {
  const text = copy[locale];
  const payable = applications.filter((a) => a.payment !== null);
  const hasWaitlisted = applications.some((a) =>
    a.terms.some((t) => t.status === 'WAITLISTED'),
  );
  const isAwaiting = (a: ConfirmationApplicationProps): boolean =>
    a.terms.some((t) => t.status === 'TO_EVALUATE');
  const hasAwaiting = applications.some(isAwaiting);
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
              {text.intro(eventName)}
            </Text>

            {applications.map((application) => (
              <Section key={application.confirmationUrl} className="mt-6">
                <Hr className="border-gray-200 my-4" />
                <Heading as="h2" className="text-lg font-semibold text-gray-900 m-0">
                  {application.name}
                </Heading>
                <Text className="text-gray-500 text-sm m-0 mt-3">
                  {text.termsHeading}
                </Text>
                {application.terms.map((term) => (
                  <Text
                    key={term.name}
                    className="text-gray-900 text-base leading-6 m-0"
                  >
                    {term.name}:{' '}
                    {term.status === 'TO_EVALUATE' ? (
                      <span className="bg-gray-100 text-gray-600 text-sm font-medium rounded-full px-2 py-1">
                        {text.toEvaluate}
                      </span>
                    ) : (
                      <strong>
                        {term.status === 'CONFIRMED'
                          ? text.confirmed
                          : text.waitlisted}
                      </strong>
                    )}
                  </Text>
                ))}
                {isAwaiting(application) ? (
                  <>
                    <Text className="text-gray-900 text-base leading-6 mt-3 mb-0">
                      {text.toEvaluateNote}
                    </Text>
                    <Section className="bg-gray-50 border border-solid border-gray-200 rounded-lg px-4 py-3 mt-3">
                      <Text className="text-gray-900 text-sm font-medium leading-5 m-0">
                        {text.toEvaluateAlertTitle}
                      </Text>
                      <Text className="text-gray-600 text-sm leading-5 m-0 mt-1">
                        {text.toEvaluateAlertText}
                      </Text>
                    </Section>
                  </>
                ) : null}
                {application.payment ? (
                  <>
                    <Text className="text-gray-500 text-sm m-0 mt-4">
                      {text.paymentHeading}
                    </Text>
                    <Text className="text-gray-900 text-base leading-6 m-0">
                      {text.amountDue}: <strong>{application.payment.amount}</strong>
                    </Text>
                    <Text className="text-gray-900 text-base leading-6 m-0">
                      {text.account}: <strong>{application.payment.bankAccount}</strong>
                    </Text>
                    <Text className="text-gray-900 text-base leading-6 m-0">
                      {text.variableSymbol}:{' '}
                      <strong>{application.payment.variableSymbol}</strong>
                    </Text>
                    {application.payment.terms.length > 0 ? (
                      <>
                        <Text className="text-gray-500 text-sm m-0 mt-3">
                          {text.payTermsHeading}
                        </Text>
                        {application.payment.terms.map((term) => (
                          <Text
                            key={term.variableSymbol}
                            className="text-gray-900 text-base leading-6 m-0"
                          >
                            {term.name}: <strong>{term.amount}</strong>,{' '}
                            {text.variableSymbol}: <strong>{term.variableSymbol}</strong>
                          </Text>
                        ))}
                      </>
                    ) : null}
                  </>
                ) : null}
                <Button
                  href={application.confirmationUrl}
                  className="bg-white text-gray-900 font-semibold rounded-md border border-solid border-gray-300 px-5 py-2 mt-4"
                >
                  {text.statusLink}
                </Button>
              </Section>
            ))}

            {payable.length > 1 ? (
              <Text className="text-gray-700 text-sm leading-5 mt-6">
                {text.severalPayments}
              </Text>
            ) : null}
            {payable.length === 0 && !hasAwaiting ? (
              <Text className="text-gray-700 text-sm leading-5 mt-6">
                {text.allWaitlisted}
              </Text>
            ) : hasWaitlisted ? (
              <Text className="text-gray-700 text-sm leading-5 mt-2">
                {text.waitlistNote}
              </Text>
            ) : null}

            <Hr className="border-gray-200 my-6" />
            <Text className="text-gray-700 text-base leading-6 m-0">
              {access.kind === 'MAGIC_LINK' ? text.magicLinkText : text.loginText}
            </Text>
            <Section className="text-center my-6">
              <Button
                href={access.url}
                className="bg-gray-900 text-white font-semibold rounded-md px-6 py-3"
              >
                {access.kind === 'MAGIC_LINK'
                  ? text.magicLinkButton
                  : text.loginButton}
              </Button>
            </Section>
            <Text className="text-gray-600 text-sm leading-5">{text.fallback}</Text>
            <Text className="text-blue-600 text-sm break-all">{access.url}</Text>
            <Hr className="border-gray-200 my-6" />
            <Text className="text-gray-400 text-xs">{text.footer}</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

// Preview data for `pnpm backend email:dev`: one participant, new account.
ApplicationConfirmation.PreviewProps = {
  locale: 'cs',
  eventName: 'Letní kemp 2027',
  access: {
    kind: 'MAGIC_LINK',
    url: 'https://team-1.vsepractical.applifting.dev/participant/magic-link?token=preview',
  },
  applications: [
    {
      name: 'Jana Nováková',
      terms: [
        { name: '1. týden', status: 'CONFIRMED' },
        { name: '2. týden', status: 'WAITLISTED' },
      ],
      payment: {
        amount: '4 500 Kč',
        bankAccount: '2900123456/2010',
        variableSymbol: '48000',
        terms: [],
      },
      confirmationUrl:
        'https://team-1.vsepractical.applifting.dev/apply/confirmation/preview-1',
    },
  ],
} satisfies ApplicationConfirmationProps;

export default ApplicationConfirmation;
