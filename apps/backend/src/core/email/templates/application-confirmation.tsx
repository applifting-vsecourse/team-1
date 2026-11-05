import { Locale } from '@/core/email/locale';
import * as React from 'react';
import {
  EmailBadgeTone,
  EmailButton,
  EmailFallbackLink,
  EmailFooter,
  EmailHeading,
  EmailLogo,
  EmailNote,
  EmailRow,
  EmailRuledBlock,
  EmailShell,
  EmailSubheading,
  EmailTerm,
  EmailText,
} from './email-kit';

// Figma (Design system): E01–E04 APP_RECEIVED · Přijetí přihlášky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19680-512 (E01 jeden účastník), https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19680-584 (E02 více účastníků, nový účet), https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19680-779 (E03 existující účet), https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19680-957 (E04 všechny termíny náhradník); 360 px: 19680-548 / 19680-686 / 19680-868 / 19680-1004; EN: 19681-1667 / 19681-1760
// Copy for all locales side by side — a missing translation is a type error. Source: docs/emaily/TEXTY.md.
const copy: Record<
  Locale,
  {
    subject: (event: string) => string;
    preview: string;
    heading: { one: string; many: string };
    intro: { one: (event: string) => string; many: (event: string) => string };
    event: string;
    participant: string;
    badge: Record<'TO_EVALUATE' | 'CONFIRMED' | 'WAITLISTED', string>;
    termText: Record<'TO_EVALUATE' | 'CONFIRMED' | 'WAITLISTED', string>;
    amountDue: string;
    account: string;
    variableSymbol: string;
    applicationSymbol: string;
    termSymbol: (term: string) => string;
    viewApplication: string;
    severalPayments: string;
    magicLinkNote: string;
    magicLinkButton: string;
    loginButton: string;
    fallback: string;
    footer: (organization: string) => string[];
  }
> = {
  en: {
    subject: (event) => `Application received: ${event}`,
    preview: 'Your submitted applications and the status of each term.',
    heading: {
      one: 'We have received your application',
      many: 'We have received your applications',
    },
    intro: {
      one: (event) =>
        `We have received your application for ${event}. Below is a summary of the participant and the status of each term.`,
      many: (event) =>
        `We have received your applications for ${event}. Below is a summary of the participants and the status of each term.`,
    },
    event: 'Event',
    participant: 'Participant',
    badge: {
      TO_EVALUATE: 'Awaiting review',
      CONFIRMED: 'Place confirmed',
      WAITLISTED: 'Waitlisted',
    },
    termText: {
      TO_EVALUATE:
        'Awaiting review. We will let you know the result by e-mail. Please do not pay yet.',
      CONFIRMED: 'The place is confirmed. Payment details are shown below.',
      WAITLISTED:
        'The application is waitlisted. We will e-mail you if the place is confirmed. Please do not pay yet.',
    },
    amountDue: 'Amount due',
    account: 'Bank account',
    variableSymbol: 'Variable symbol',
    applicationSymbol: 'Variable symbol of the whole application',
    termSymbol: (term) => `Variable symbol of the term · ${term}`,
    viewApplication: 'View application',
    severalPayments:
      'Please pay only for confirmed terms. Pay for each application separately using the amount and variable symbol shown.',
    magicLinkNote:
      'The link is valid for 7 days and can only be used once. If it no longer works, you can request a new one on the Togena sign-in page.',
    magicLinkButton: 'Sign in to Togena',
    loginButton: 'Sign in to Togena',
    fallback: "If the button doesn't work, copy this link into your browser:",
    footer: (organization) => [
      `${organization} · via Togena`,
      'Questions about your application, attendance or payment: organizator@togena.com',
    ],
  },
  cs: {
    subject: (event) => `Přihláška přijata: ${event}`,
    preview: 'Přehled přijatých přihlášek a stavů jednotlivých termínů.',
    heading: { one: 'Přihlášku jsme přijali', many: 'Přihlášky jsme přijali' },
    intro: {
      one: (event) =>
        `Přijali jsme vaši přihlášku na akci ${event}. Níže najdete přehled účastníka a stav jednotlivých termínů.`,
      many: (event) =>
        `Přijali jsme vaše přihlášky na akci ${event}. Níže najdete přehled účastníků a stav jednotlivých termínů.`,
    },
    event: 'Akce',
    participant: 'Účastník',
    badge: {
      TO_EVALUATE: 'Čeká na vyhodnocení',
      CONFIRMED: 'Účast potvrzena',
      WAITLISTED: 'Náhradník',
    },
    termText: {
      TO_EVALUATE:
        'Čeká na vyhodnocení. O výsledku vás informujeme e-mailem. Zatím nic neplaťte.',
      CONFIRMED: 'Účast je potvrzená. Platební údaje najdete níže.',
      WAITLISTED:
        'Přihláška je zařazena mezi náhradníky. Pokud bude účast potvrzena, informujeme vás e-mailem. Zatím nic neplaťte.',
    },
    amountDue: 'K úhradě',
    account: 'Bankovní účet',
    variableSymbol: 'Variabilní symbol',
    applicationSymbol: 'VS celé přihlášky',
    termSymbol: (term) => `VS termínu · ${term}`,
    viewApplication: 'Zobrazit přihlášku',
    severalPayments:
      'Plaťte pouze za potvrzené termíny. Každou přihlášku zaplaťte samostatně podle uvedené částky a variabilního symbolu.',
    magicLinkNote:
      'Odkaz platí 7 dní a lze jej použít pouze jednou. Pokud už nefunguje, na přihlašovací stránce Togeny si můžete nechat poslat nový.',
    magicLinkButton: 'Přihlásit se do Togeny',
    loginButton: 'Přihlásit se do Togeny',
    fallback: 'Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:',
    footer: (organization) => [
      `${organization} · prostřednictvím Togeny`,
      'Dotazy k přihlášce, účasti nebo platbě: organizator@togena.com',
    ],
  },
};

export const applicationConfirmationSubject = (
  locale: Locale,
  eventName: string,
): string => copy[locale].subject(eventName);

const TONE: Record<'TO_EVALUATE' | 'CONFIRMED' | 'WAITLISTED', EmailBadgeTone> = {
  TO_EVALUATE: 'neutral',
  CONFIRMED: 'success',
  WAITLISTED: 'waitlist',
};

export interface ConfirmationApplicationProps {
  /** First and last name of the participant. */
  name: string;
  terms: {
    /** The dates of the term, already formatted. */
    dates: string;
    /** The name the organizer gave the term, if any. */
    name: string | null;
    status: 'TO_EVALUATE' | 'CONFIRMED' | 'WAITLISTED';
  }[];
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
  /** The organization that runs the event; the footer. */
  organizationName: string;
  /** Magic link (account without a password) or the sign-in page. */
  access: { kind: 'MAGIC_LINK' | 'LOGIN'; url: string };
  applications: ConfirmationApplicationProps[];
}

export const ApplicationConfirmation = ({
  locale,
  eventName,
  organizationName,
  access,
  applications,
}: ApplicationConfirmationProps): React.JSX.Element => {
  const text = copy[locale];
  const isSingle = applications.length === 1;
  const payable = applications.filter((a) => a.payment !== null);
  return (
    <EmailShell locale={locale} preview={text.preview}>
      <EmailLogo />
      <EmailHeading>{isSingle ? text.heading.one : text.heading.many}</EmailHeading>
      <EmailText>
        {isSingle ? text.intro.one(eventName) : text.intro.many(eventName)}
      </EmailText>
      <EmailRuledBlock>
        <EmailRow label={text.event} value={eventName} />
        {isSingle ? (
          <EmailRow label={text.participant} value={applications[0].name} />
        ) : null}
      </EmailRuledBlock>

      {applications.map((application) => (
        <React.Fragment key={application.confirmationUrl}>
          {isSingle ? null : <EmailSubheading>{application.name}</EmailSubheading>}
          {application.terms.map((term, index) => (
            <EmailTerm
              key={`${term.dates}-${term.name ?? ''}`}
              dates={term.dates}
              name={term.name}
              badge={text.badge[term.status]}
              tone={TONE[term.status]}
              text={text.termText[term.status]}
              last={index === application.terms.length - 1}
            />
          ))}
          {application.payment ? (
            <EmailRuledBlock>
              <EmailRow label={text.amountDue} value={application.payment.amount} />
              <EmailRow label={text.account} value={application.payment.bankAccount} />
              {application.payment.terms.length > 0 ? (
                <>
                  <EmailRow
                    label={text.applicationSymbol}
                    value={application.payment.variableSymbol}
                  />
                  {application.payment.terms.map((term) => (
                    <EmailRow
                      key={term.variableSymbol}
                      label={text.termSymbol(term.name)}
                      value={term.variableSymbol}
                    />
                  ))}
                </>
              ) : (
                <EmailRow
                  label={text.variableSymbol}
                  value={application.payment.variableSymbol}
                />
              )}
            </EmailRuledBlock>
          ) : null}
          <EmailButton
            href={application.confirmationUrl}
            variant={isSingle ? 'primary' : 'secondary'}
          >
            {text.viewApplication}
          </EmailButton>
        </React.Fragment>
      ))}

      {payable.length > 1 ? <EmailNote>{text.severalPayments}</EmailNote> : null}
      {access.kind === 'MAGIC_LINK' ? <EmailNote>{text.magicLinkNote}</EmailNote> : null}
      <EmailButton href={access.url}>
        {access.kind === 'MAGIC_LINK' ? text.magicLinkButton : text.loginButton}
      </EmailButton>
      {access.kind === 'MAGIC_LINK' ? (
        <EmailFallbackLink label={text.fallback} url={access.url} />
      ) : null}
      <EmailFooter lines={text.footer(organizationName)} />
    </EmailShell>
  );
};

// Preview data for `pnpm backend email:dev`: one participant, new account.
ApplicationConfirmation.PreviewProps = {
  locale: 'cs',
  eventName: 'Letní kemp Lipno 2027',
  organizationName: 'Alpine Collective',
  access: {
    kind: 'MAGIC_LINK',
    url: 'https://team-1.vsepractical.applifting.dev/participant/magic-link?token=preview',
  },
  applications: [
    {
      name: 'Jana Nováková',
      terms: [
        { dates: '12.–18. 7. 2027', name: '1. turnus', status: 'CONFIRMED' },
        { dates: '19.–25. 7. 2027', name: '2. turnus', status: 'WAITLISTED' },
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
