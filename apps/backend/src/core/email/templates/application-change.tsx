import { Locale } from '@/core/email/locale';
import {
  ChangeLayout,
  ChangeLayoutProps,
} from '@/core/email/templates/application-change-layout';
import * as React from 'react';

/**
 * What happened to the application in one term (docs/procesy/zpracovani-prihlasky/EMAILY.md):
 *
 * - `CONFIRMED`: K vyhodnocení → Potvrzená s dluhem (no. 2)
 * - `WAITLISTED`: K vyhodnocení → Náhradník (no. 3)
 * - `REJECTED`: → Zrušená by the organizer's decision (no. 4, 9, 10)
 * - `CONFIRMED_FROM_WAITLIST`: Náhradník → Potvrzená s dluhem (no. 5)
 * - `NO_BED_FREED`: Náhradník → Zrušená at midnight of the first day of the term (no. 6)
 * - `CANCELLED`: the applicant cancelled (no. 11)
 * - `CANCELLED_BY_ORGANIZER`: Náhradník → Zrušená by the organizer (no. 14)
 *
 * No. 13 (Potvrzená s dluhem → Náhradník) and no. 15 (term cancelled) have their own templates.
 */
export type ChangeKind =
  | 'CONFIRMED'
  | 'CONFIRMED_FROM_WAITLIST'
  | 'WAITLISTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'NO_BED_FREED'
  | 'CANCELLED_BY_ORGANIZER';

type KindCopy = {
  heading: string;
  /** `name` is the participant (nominative), `term` the term's name or dates. */
  text: (name: string, term: string) => string;
  badge: string;
  tone: ChangeLayoutProps['badge']['tone'];
};

// Copy for all locales side by side — a missing translation is a type error.
// Czech sentences name the participant in brackets: a Czech name cannot be declined by code.
const copy: Record<
  Locale,
  {
    subject: (event: string) => string;
    kinds: Record<ChangeKind, KindCopy>;
    amountDue: string;
    account: string;
    variableSymbol: string;
    button: string;
    footer: (organization: string) => string;
  }
> = {
  en: {
    subject: (event) => `Change in your application: ${event}`,
    kinds: {
      // Figma: E-mail 02 EN
      CONFIRMED: {
        heading: 'Your place is confirmed',
        text: (name, term) =>
          `The organiser has confirmed ${name}’s place for ${term}.`,
        badge: 'Confirmed · payment due',
        tone: 'positive',
      },
      CONFIRMED_FROM_WAITLIST: {
        heading: 'A bed has become free. Your place is confirmed',
        text: (name, term) =>
          `${name} is no longer a substitute. Their place for ${term} has been confirmed.`,
        badge: 'Confirmed · payment due',
        tone: 'positive',
      },
      WAITLISTED: {
        heading: 'You are a substitute',
        text: (name, term) =>
          `${name} has been placed among the substitutes for ${term}. Please do not pay anything yet.`,
        badge: 'Substitute',
        tone: 'neutral',
      },
      REJECTED: {
        heading: 'Your application was rejected',
        text: (name, term) =>
          `The organiser rejected ${name}’s place for ${term}. The status of the application in this term is Cancelled.`,
        badge: 'Cancelled',
        tone: 'neutral',
      },
      CANCELLED: {
        heading: 'Your cancellation is confirmed',
        text: (name, term) =>
          `${name} has been cancelled from ${term}. The other terms of the application stay unchanged.`,
        badge: 'Cancelled',
        tone: 'neutral',
      },
      NO_BED_FREED: {
        heading: 'The term has started, no bed became free',
        text: (name, term) =>
          `No bed became free for ${name} before ${term} started. The application in this term is therefore cancelled.`,
        badge: 'Cancelled',
        tone: 'neutral',
      },
      CANCELLED_BY_ORGANIZER: {
        heading: 'Application cancelled by the organiser',
        text: (name, term) =>
          `The organiser cancelled the application of ${name}, who was a substitute for ${term}.`,
        badge: 'Cancelled',
        tone: 'neutral',
      },
    },
    amountDue: 'Amount due',
    account: 'Bank account',
    variableSymbol: 'Reference number',
    button: 'Open my applications',
    footer: (organization) => `${organization} · via Togena`,
  },
  cs: {
    subject: (event) => `Změna ve vaší přihlášce: ${event}`,
    kinds: {
      CONFIRMED: {
        heading: 'Účast je potvrzená',
        text: (name, term) =>
          `Organizátor potvrdil účast v termínu ${term} (${name}).`,
        badge: 'Účast potvrzena',
        tone: 'positive',
      },
      CONFIRMED_FROM_WAITLIST: {
        heading: 'Uvolnilo se lůžko. Účast je potvrzená',
        text: (name, term) =>
          `V termínu ${term} už nejste náhradník (${name}). Vaše účast byla potvrzená.`,
        badge: 'Účast potvrzena',
        tone: 'positive',
      },
      WAITLISTED: {
        heading: 'Jste náhradník',
        text: (name, term) =>
          `V termínu ${term} jste zařazeni mezi náhradníky (${name}). Zatím nic neplaťte.`,
        badge: 'Náhradník',
        tone: 'neutral',
      },
      REJECTED: {
        heading: 'Přihláška byla zamítnuta',
        text: (name, term) =>
          `Organizátor zamítl účast v termínu ${term} (${name}). Stav přihlášky v tomto termínu je Zrušená.`,
        badge: 'Zrušená',
        tone: 'neutral',
      },
      CANCELLED: {
        heading: 'Odhlášení je potvrzené',
        text: (name, term) =>
          `Z termínu ${term} je odhlášený účastník ${name}. Ostatní termíny přihlášky zůstávají beze změny.`,
        badge: 'Zrušená',
        tone: 'neutral',
      },
      NO_BED_FREED: {
        heading: 'Termín začal, lůžko se neuvolnilo',
        text: (name, term) =>
          `Do začátku termínu ${term} se pro účastníka ${name} neuvolnilo lůžko. Přihláška v tomto termínu je proto zrušená.`,
        badge: 'Zrušená',
        tone: 'neutral',
      },
      CANCELLED_BY_ORGANIZER: {
        heading: 'Přihláška zrušená organizátorem',
        text: (name, term) =>
          `Organizátor zrušil přihlášku účastníka ${name}, který byl náhradníkem v termínu ${term}.`,
        badge: 'Zrušená',
        tone: 'neutral',
      },
    },
    amountDue: 'K úhradě',
    account: 'Bankovní účet',
    variableSymbol: 'Variabilní symbol',
    button: 'Otevřít moje přihlášky',
    footer: (organization) => `${organization} · přes Togenu`,
  },
};

export const applicationChangeSubject = (
  locale: Locale,
  eventName: string,
): string => copy[locale].subject(eventName);

export interface ApplicationChangeProps {
  locale: Locale;
  eventName: string;
  /** Name of the organization that runs the event, for the footer. */
  organizationName: string;
  /** First and last name of the participant. */
  name: string;
  /** The changed term: its name, or its dates. */
  term: string;
  kind: ChangeKind;
  /** Only when the application became confirmed; amounts are already formatted. */
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

export const ApplicationChange = ({
  locale,
  eventName,
  organizationName,
  name,
  term,
  kind,
  payment,
  confirmationUrl,
}: ApplicationChangeProps): React.JSX.Element => {
  const text = copy[locale];
  const kindCopy = text.kinds[kind];
  const details = payment
    ? [
        { label: text.amountDue, value: payment.amount },
        { label: text.account, value: payment.bankAccount },
        { label: text.variableSymbol, value: payment.variableSymbol },
        // Not drawn in Figma: kept from US-137, each confirmed term can be paid on its own.
        ...payment.terms.map((paid) => ({
          label: paid.name,
          value: `${paid.amount} · ${text.variableSymbol} ${paid.variableSymbol}`,
        })),
      ]
    : [];
  return (
    <ChangeLayout
      locale={locale}
      preview={kindCopy.heading}
      heading={kindCopy.heading}
      eventName={eventName}
      text={kindCopy.text(name, term)}
      badge={{ label: kindCopy.badge, tone: kindCopy.tone }}
      details={details}
      buttonLabel={text.button}
      buttonUrl={confirmationUrl}
      footer={text.footer(organizationName)}
    />
  );
};

// Figma (Design system): US-116 E-mailová šablona · E-mail 02 (Účast je potvrzená) · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15981-290 (360 px: 15981-329; EN: 15981-866 / 15981-905)
// Figma (Design system): US-116 E-mail 03 (Jste náhradník) · node-id=15981-368 (360 px: 15981-398)
// Figma (Design system): US-116 E-mail 04 / 09 / 10 (Přihláška byla zamítnuta) · node-id=15981-428 (360 px: 15981-458)
// Figma (Design system): US-116 E-mail 05 (Uvolnilo se lůžko) · node-id=15981-488 (360 px: 15981-527)
// Figma (Design system): US-116 E-mail 06 (Termín začal, lůžko se neuvolnilo) · node-id=15981-566 (360 px: 15981-596)
// Figma (Design system): US-116 E-mail 11 (Odhlášení je potvrzené) · node-id=15981-626 (360 px: 15981-656)
// Figma (Design system): US-116 E-mail 14 (Přihláška zrušená organizátorem) · node-id=15981-746 (360 px: 15981-776)
// All under https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=<id>

// Preview data for `pnpm backend email:dev`: a term was confirmed, payment details follow.
ApplicationChange.PreviewProps = {
  locale: 'cs',
  eventName: 'Letní kemp Lipno 2027',
  organizationName: 'Alpine Collective',
  name: 'Adam Dvořák',
  term: '12.–18. 7. 2027',
  kind: 'CONFIRMED',
  payment: {
    amount: '4 900 Kč',
    bankAccount: '123456789 / 0000',
    variableSymbol: '2027001000',
    terms: [],
  },
  confirmationUrl:
    'https://team-1.vsepractical.applifting.dev/apply/confirmation/preview-2',
} satisfies ApplicationChangeProps;

export default ApplicationChange;
