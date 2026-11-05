import { Locale } from '@/core/email/locale';
import { ChangeLayout, ChangeLayoutProps } from '@/core/email/templates/application-change-layout';
import { ApplicationTermStatus } from '@/modules/applications/domain/evaluation';
import { Gender } from '@/shared/domain/gender';
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
 * `TERMS_CHANGED` summarizes all resulting term statuses after a participant's change.
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
  | 'CANCELLED_BY_ORGANIZER'
  /** US-33 / US-84: no trigger yet, no frame. */
  | 'TERMS_CHANGED';

type KindCopy = {
  heading: string;
  /** `name` is the participant (nominative), `term` the term's name or dates. */
  text: (name: string, term: string, gender: Gender) => string;
  badge: { label: string; tone: 'positive' | 'neutral' } | null;
};

// Copy for all locales side by side — a missing translation is a type error.
// Czech: where a frame names the participant in the nominative the sentence is verbatim, with the
// gendered forms picked by `gender`. Where a frame declines the name ("účast Adama Dvořáka") code
// cannot do that, so the name stands in its place in brackets, the rest verbatim.
const copy: Record<
  Locale,
  {
    subject: (event: string) => string;
    kinds: Record<ChangeKind, KindCopy>;
    statuses: Record<ApplicationTermStatus, string>;
    amountDue: string;
    account: string;
    variableSymbol: string;
    button: string;
    footer: (organization: string) => string;
  }
> = {
  en: {
    subject: (event) => `Change in your application: ${event}`,
    statuses: {
      TO_EVALUATE: 'Awaiting evaluation · do not pay yet',
      CONFIRMED: 'Confirmed',
      WAITLISTED: 'Substitute · do not pay yet',
      CANCELLED: 'Cancelled',
    },
    kinds: {
      // Figma: E-mail 02 EN
      CONFIRMED: {
        heading: 'Your place is confirmed',
        text: (name, term) => `The organiser has confirmed ${name}’s place for ${term}.`,
        badge: { label: 'Confirmed · payment due', tone: 'positive' },
      },
      CONFIRMED_FROM_WAITLIST: {
        heading: 'A bed has become free. Your place is confirmed',
        text: (name, term) =>
          `${name} is no longer a substitute. Their place for ${term} has been confirmed.`,
        badge: { label: 'Confirmed · payment due', tone: 'positive' },
      },
      WAITLISTED: {
        heading: 'You are a substitute',
        text: (name, term) =>
          `${name} has been placed among the substitutes for ${term}. Please do not pay anything yet.`,
        badge: { label: 'Substitute', tone: 'neutral' },
      },
      REJECTED: {
        heading: 'Your application was rejected',
        text: (name, term) =>
          `The organiser rejected ${name}’s place for ${term}. The status of the application in this term is Cancelled.`,
        badge: { label: 'Cancelled', tone: 'neutral' },
      },
      CANCELLED: {
        heading: 'Your cancellation is confirmed',
        text: (name, term) =>
          `${name} has been cancelled from ${term}. The other terms of the application stay unchanged.`,
        badge: { label: 'Cancelled', tone: 'neutral' },
      },
      NO_BED_FREED: {
        heading: 'The term has started, no bed became free',
        text: (name, term) =>
          `No bed became free for ${name} before ${term} started. The application in this term is therefore cancelled.`,
        badge: { label: 'Cancelled', tone: 'neutral' },
      },
      CANCELLED_BY_ORGANIZER: {
        heading: 'Application cancelled by the organiser',
        text: (name, term) =>
          `The organiser cancelled the application of ${name}, who was a substitute for ${term}.`,
        badge: { label: 'Cancelled', tone: 'neutral' },
      },
      TERMS_CHANGED: {
        heading: 'Your application changed',
        text: () => 'The terms of the application changed.',
        badge: null,
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
    statuses: {
      TO_EVALUATE: 'Čeká na vyhodnocení · zatím neplaťte',
      CONFIRMED: 'Účast potvrzena',
      WAITLISTED: 'Náhradník · zatím neplaťte',
      CANCELLED: 'Zrušená',
    },
    kinds: {
      CONFIRMED: {
        heading: 'Účast je potvrzená',
        text: (name, term) => `Organizátor potvrdil účast (${name}) v termínu ${term}.`,
        badge: { label: 'Účast potvrzena', tone: 'positive' },
      },
      CONFIRMED_FROM_WAITLIST: {
        heading: 'Uvolnilo se lůžko. Účast je potvrzená',
        text: (name, term, gender) =>
          `${name} už není ${gender === 'FEMALE' ? 'náhradnice' : 'náhradník'}. ${gender === 'FEMALE' ? 'Její' : 'Jeho'} účast v termínu ${term} byla potvrzená.`,
        badge: { label: 'Účast potvrzena', tone: 'positive' },
      },
      WAITLISTED: {
        heading: 'Jste náhradník',
        text: (name, term, gender) =>
          `${name} je v termínu ${term} zařazen${gender === 'FEMALE' ? 'á' : 'ý'} mezi náhradníky. Zatím nic neplaťte.`,
        badge: { label: 'Náhradník', tone: 'neutral' },
      },
      REJECTED: {
        heading: 'Přihláška byla zamítnuta',
        text: (name, term) =>
          `Organizátor zamítl účast (${name}) v termínu ${term}. Stav přihlášky v tomto termínu je Zrušená.`,
        badge: { label: 'Zrušená', tone: 'neutral' },
      },
      CANCELLED: {
        heading: 'Odhlášení je potvrzené',
        text: (name, term, gender) =>
          `${name} je odhlášen${gender === 'FEMALE' ? 'á' : 'ý'} z termínu ${term}. Ostatní termíny přihlášky zůstávají beze změny.`,
        badge: { label: 'Zrušená', tone: 'neutral' },
      },
      NO_BED_FREED: {
        heading: 'Termín začal, lůžko se neuvolnilo',
        text: (name, term) =>
          `Do začátku termínu ${term} se pro (${name}) neuvolnilo lůžko. Přihláška v tomto termínu je proto zrušená.`,
        badge: { label: 'Zrušená', tone: 'neutral' },
      },
      CANCELLED_BY_ORGANIZER: {
        heading: 'Přihláška zrušená organizátorem',
        text: (name, term, gender) =>
          `Organizátor zrušil přihlášku (${name}), ${gender === 'FEMALE' ? 'která byla náhradnicí' : 'který byl náhradníkem'} v termínu ${term}.`,
        badge: { label: 'Zrušená', tone: 'neutral' },
      },
      TERMS_CHANGED: {
        heading: 'Změna přihlášky',
        text: () => 'Změnily se termíny přihlášky.',
        badge: null,
      },
    },
    amountDue: 'K úhradě',
    account: 'Bankovní účet',
    variableSymbol: 'Variabilní symbol',
    button: 'Otevřít moje přihlášky',
    footer: (organization) => `${organization} · přes Togenu`,
  },
};

export const applicationChangeSubject = (locale: Locale, eventName: string): string =>
  copy[locale].subject(eventName);

export interface ApplicationChangeProps {
  locale: Locale;
  eventName: string;
  /** Name of the organization that runs the event, for the footer. */
  organizationName: string;
  /** First and last name of the participant. */
  name: string;
  /** Of the participant: the Czech copy is gendered. */
  gender: Gender;
  /** The changed term: its name, or its dates. */
  term: string;
  kind: ChangeKind;
  /** Result of each term when several terms changed in one request. */
  terms: { name: string; status: ApplicationTermStatus }[];
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
  gender,
  term,
  kind,
  terms,
  payment,
  confirmationUrl,
}: ApplicationChangeProps): React.JSX.Element => {
  const text = copy[locale];
  const kindCopy = text.kinds[kind];
  const details = [
    ...(kind === 'TERMS_CHANGED'
      ? terms.map(({ name, status }) => ({ label: name, value: text.statuses[status] }))
      : []),
    ...(payment
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
      : []),
  ];
  return (
    <ChangeLayout
      locale={locale}
      preview={kindCopy.heading}
      heading={kindCopy.heading}
      eventName={eventName}
      text={kindCopy.text(name, term, gender)}
      badge={kindCopy.badge}
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
  gender: 'MALE',
  term: '12.–18. 7. 2027',
  kind: 'CONFIRMED',
  terms: [],
  payment: {
    amount: '4 900 Kč',
    bankAccount: '123456789 / 0000',
    variableSymbol: '2027001000',
    terms: [],
  },
  confirmationUrl: 'https://team-1.vsepractical.applifting.dev/apply/confirmation/preview-2',
} satisfies ApplicationChangeProps;

export default ApplicationChange;
