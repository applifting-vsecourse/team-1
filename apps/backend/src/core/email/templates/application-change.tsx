import { Locale } from '@/core/email/locale';
import { ChangeLayout } from '@/core/email/templates/application-change-layout';
import { ApplicationTermStatus } from '@/modules/applications/domain/evaluation';
import { changeCommon, termValue } from '@/core/email/templates/application-change-copy';
import * as React from 'react';

/**
 * What happened to the application in one term (docs/emaily/KATALOG.md):
 *
 * - `CONFIRMED`: K vyhodnocení → Potvrzená s dluhem (no. 2)
 * - `WAITLISTED`: K vyhodnocení → Náhradník (no. 3)
 * - `REJECTED`: → Zrušená by the organizer's decision (no. 4, 9, 10)
 * - `CONFIRMED_FROM_WAITLIST`: Náhradník → Potvrzená s dluhem (no. 5)
 * - `NO_BED_FREED`: Náhradník → Zrušená at midnight of the first day of the term (no. 6)
 * - `CANCELLED`: the applicant cancelled (no. 11)
 * - `CANCELLED_BY_ORGANIZER`: Náhradník → Zrušená by the organizer (no. 14)
 *
 * - `PAYMENT_OVERDUE`: the payment deadline passed, the organizer asked for a reminder (E14)
 * - `PAYMENT_SETTLED`: the application in the term became fully paid (E15)
 * - `PAYMENT_CORRECTED`: a payment was corrected and a balance is due again (E16)
 *
 * `TERMS_CHANGED` is prepared for the term-change stories; nothing sends it yet.
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
  /** The payment e-mails: only these carry (OVERDUE, CORRECTED) or omit (SETTLED) payment details. */
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_SETTLED'
  | 'PAYMENT_CORRECTED'
  /** US-33 / US-84: no trigger yet, no frame. */
  | 'TERMS_CHANGED';

type KindCopy = {
  subject: (event: string) => string;
  preview: string;
  heading: string;
  text: string;
  /** A sentence under the identification, where the frame has one. */
  note?: string;
};

const REFUND = {
  en: 'The organiser will let you know about any possible refund.',
  cs: 'Informace o případném vrácení platby vám sdělí organizátor.',
} as const;

// Copy for all locales side by side — a missing translation is a type error. Source: docs/emaily/TEXTY.md.
const copy: Record<Locale, Record<ChangeKind, KindCopy>> = {
  en: {
    CONFIRMED: {
      subject: (event) => `Place confirmed: ${event}`,
      preview: 'Your place is confirmed. Payment details are included.',
      heading: 'The place is confirmed',
      text: 'The place in the term shown below has been confirmed. Payment details are included below.',
    },
    CONFIRMED_FROM_WAITLIST: {
      subject: (event) => `Place confirmed: ${event}`,
      preview: 'Your place is confirmed. Payment details are included.',
      heading: 'The place is confirmed',
      text: 'The place in the term shown below has been confirmed. Payment details are included below.',
    },
    WAITLISTED: {
      subject: (event) => `Application waitlisted: ${event}`,
      preview: 'The application has been placed on the waiting list.',
      heading: 'The application is waitlisted',
      text: 'The application for the term shown below has been waitlisted. We will e-mail you if the place is confirmed. Please do not pay for this term yet.',
    },
    REJECTED: {
      subject: (event) => `Application rejected: ${event}`,
      preview: 'The organiser has rejected the application for the term shown below.',
      heading: 'The application has been rejected',
      text: 'The organiser has rejected the application for the term shown below. The application for this term is now cancelled. You do not need to confirm the cancellation.',
      note: REFUND.en,
    },
    NO_BED_FREED: {
      subject: (event) => `Application cancelled: ${event}`,
      preview: 'Cancellation of the waitlisted application for the term shown below.',
      heading: 'Application cancelled',
      text: 'The place in the term shown below was not confirmed. The application for this term is therefore cancelled. You do not need to confirm the cancellation.',
    },
    CANCELLED_BY_ORGANIZER: {
      subject: (event) => `Application cancelled by the organiser: ${event}`,
      preview: 'The organiser has cancelled the waitlisted application.',
      heading: 'The application has been cancelled by the organiser',
      text: 'The organiser has cancelled the application for the term shown below, where it was on the waiting list. You do not need to confirm the cancellation.',
    },
    CANCELLED: {
      subject: (event) => `Cancellation confirmed: ${event}`,
      preview: 'Confirmation of cancellation for the term shown below.',
      heading: 'The cancellation is confirmed',
      text: 'We confirm the cancellation for the term shown below. The application for this term is now cancelled.',
      note: REFUND.en,
    },
    PAYMENT_OVERDUE: {
      subject: (event) => `Payment overdue: ${event}`,
      preview: 'The payment deadline has passed. Please check the outstanding amount.',
      heading: 'Payment is outstanding',
      text: 'The payment deadline for the application in the term shown below has passed and an amount remains outstanding. Please pay the outstanding amount using the details below.',
    },
    PAYMENT_SETTLED: {
      subject: (event) => `Payment received: ${event}`,
      preview: 'The application for the term shown below is fully paid.',
      heading: 'Your payment has been recorded',
      text: 'We have recorded your payment and the application for the term shown below is fully paid. There is no outstanding balance for this term.',
    },
    PAYMENT_CORRECTED: {
      subject: (event) => `Payment correction: outstanding balance for ${event}`,
      preview: 'The previous confirmation of full payment is no longer valid. The outstanding amount is shown below.',
      heading: 'An outstanding balance remains after a payment correction',
      text: 'Following the organiser’s correction of the payment record, the amount shown below remains outstanding for the application in this term. The previous confirmation of full payment is no longer valid. Please pay the outstanding amount using the payment details provided.',
    },
    TERMS_CHANGED: {
      subject: (event) => `Changes to your application: ${event}`,
      preview: 'A summary of application status changes for individual terms.',
      heading: 'Changes to your application',
      text: 'The status of your application has changed for the term listed below.',
    },
  },
  cs: {
    CONFIRMED: {
      subject: (event) => `Účast potvrzena: ${event}`,
      preview: 'Potvrzení účasti a údaje k platbě.',
      heading: 'Účast je potvrzená',
      text: 'Účast v uvedeném termínu byla potvrzena. Platební údaje najdete níže.',
    },
    CONFIRMED_FROM_WAITLIST: {
      subject: (event) => `Účast potvrzena: ${event}`,
      preview: 'Potvrzení účasti a údaje k platbě.',
      heading: 'Účast je potvrzená',
      text: 'Účast v uvedeném termínu byla potvrzena. Platební údaje najdete níže.',
    },
    WAITLISTED: {
      subject: (event) => `Zařazení mezi náhradníky: ${event}`,
      preview: 'Přihláška je zařazena mezi náhradníky.',
      heading: 'Přihláška je mezi náhradníky',
      text: 'Přihláška v uvedeném termínu byla zařazena mezi náhradníky. Pokud bude účast potvrzena, informujeme vás e-mailem. Za tento termín zatím nic neplaťte.',
    },
    REJECTED: {
      subject: (event) => `Přihláška zamítnuta: ${event}`,
      preview: 'Organizátor zamítl účast v uvedeném termínu.',
      heading: 'Přihláška byla zamítnuta',
      text: 'Organizátor zamítl účast v uvedeném termínu. Přihláška v tomto termínu je zrušená. Zrušení nemusíte potvrzovat.',
      note: REFUND.cs,
    },
    NO_BED_FREED: {
      subject: (event) => `Přihláška byla zrušena: ${event}`,
      preview: 'Zrušení přihlášky náhradníka v uvedeném termínu.',
      heading: 'Přihláška byla zrušena',
      text: 'Účast v uvedeném termínu nebyla potvrzena. Přihláška v tomto termínu je proto zrušená. Zrušení nemusíte potvrzovat.',
    },
    CANCELLED_BY_ORGANIZER: {
      subject: (event) => `Přihláška zrušena organizátorem: ${event}`,
      preview: 'Organizátor zrušil přihlášku vedenou mezi náhradníky.',
      heading: 'Přihláška byla zrušena organizátorem',
      text: 'Organizátor zrušil přihlášku v uvedeném termínu, ve kterém byla vedena mezi náhradníky. Zrušení nemusíte potvrzovat.',
    },
    CANCELLED: {
      subject: (event) => `Odhlášení potvrzeno: ${event}`,
      preview: 'Potvrzení odhlášení z uvedeného termínu.',
      heading: 'Odhlášení je potvrzené',
      text: 'Potvrzujeme odhlášení z uvedeného termínu. Přihláška v tomto termínu je zrušená.',
      note: REFUND.cs,
    },
    PAYMENT_OVERDUE: {
      subject: (event) => `Výzva k zaplacení: ${event}`,
      preview: 'Uplynula lhůta pro zaplacení. Zkontrolujte zbývající částku.',
      heading: 'Zbývá uhradit platbu',
      text: 'U přihlášky v uvedeném termínu uplynula lhůta pro zaplacení a evidujeme nedoplatek. Uhraďte prosím zbývající částku podle údajů níže.',
    },
    PAYMENT_SETTLED: {
      subject: (event) => `Platba přijata: ${event}`,
      preview: 'Přihláška v uvedeném termínu je plně zaplacená.',
      heading: 'Platbu jsme zaevidovali',
      text: 'Zaevidovali jsme platbu a přihláška v uvedeném termínu je plně zaplacená. Za tento termín již nic nedlužíte.',
    },
    PAYMENT_CORRECTED: {
      subject: (event) => `Po opravě platby zbývá doplatit: ${event}`,
      preview: 'Předchozí potvrzení o úplném zaplacení již neplatí. Níže najdete částku k doplacení.',
      heading: 'Po opravě platby zbývá nedoplatek',
      text: 'Po opravě evidence platby organizátorem zbývá u přihlášky v uvedeném termínu doplatit částku uvedenou níže. Předchozí potvrzení o úplném zaplacení již neplatí. Uhraďte prosím nedoplatek podle uvedených platebních údajů.',
    },
    TERMS_CHANGED: {
      subject: (event) => `Změny v přihlášce: ${event}`,
      preview: 'Přehled změn stavu přihlášky v jednotlivých termínech.',
      heading: 'Změny v přihlášce',
      text: 'U vaší přihlášky se změnil stav v níže uvedeném termínu.',
    },
  },
};

export const applicationChangeSubject = (
  locale: Locale,
  eventName: string,
  kind: ChangeKind,
): string => copy[locale][kind].subject(eventName);

export interface ApplicationChangeProps {
  locale: Locale;
  eventName: string;
  /** Name of the organization that runs the event, for the footer. */
  organizationName: string;
  /** First and last name of the participant. */
  name: string;
  /** The dates of the changed term, already formatted. */
  termDates: string;
  /** The name the organizer gave the term, if any. */
  termName: string | null;
  kind: ChangeKind;
  /** Result of each term when several terms changed in one request (`TERMS_CHANGED`). */
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
  termDates,
  termName,
  kind,
  terms,
  payment,
  confirmationUrl,
}: ApplicationChangeProps): React.JSX.Element => {
  const common = changeCommon[locale];
  const kindCopy = copy[locale][kind];
  const termRows =
    kind === 'TERMS_CHANGED'
      ? terms.map(({ name: label, status }) => ({ label, value: common.statuses[status] }))
      : [];
  const paymentRows = payment
    ? [
        { label: common.amountDue, value: payment.amount },
        { label: common.account, value: payment.bankAccount },
        ...(payment.terms.length > 0
          ? [
              { label: common.applicationSymbol, value: payment.variableSymbol },
              ...payment.terms.map((paid) => ({
                label: common.termSymbol(paid.name),
                value: paid.variableSymbol,
              })),
            ]
          : [{ label: common.variableSymbol, value: payment.variableSymbol }]),
      ]
    : [];
  const details = [...termRows, ...paymentRows];
  return (
    <ChangeLayout
      locale={locale}
      preview={kindCopy.preview}
      heading={kindCopy.heading}
      text={kindCopy.text}
      labels={common.labels}
      eventName={eventName}
      participantName={name}
      termValue={termValue(termDates, termName)}
      details={details}
      note={kindCopy.note ?? null}
      buttonLabel={common.button}
      buttonUrl={confirmationUrl}
      footer={common.footer(organizationName)}
    />
  );
};

// Figma (Design system): E05 APP_CONFIRMED · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19681-665 (360 px: 19681-702; EN: 19681-1853 / 19681-1890)
// Figma (Design system): E06 APP_WAITLISTED · node-id=19681-739 (360 px: 19681-766)
// Figma (Design system): E07 APP_REJECTED · node-id=19681-793 (360 px: 19681-821)
// Figma (Design system): E08 APP_WAITLIST_EXPIRED · node-id=19681-849 (360 px: 19681-876)
// Figma (Design system): E10 APP_WAITLIST_CANCELLED · node-id=19681-957 (360 px: 19681-984)
// Figma (Design system): E14 PAYMENT_OVERDUE · node-id=19681-1259 (360 px: 19681-1296)
// Figma (Design system): E15 PAYMENT_SETTLED · node-id=19681-1333 (360 px: 19681-1360)
// Figma (Design system): E16 PAYMENT_CORRECTED · node-id=19681-1387 (360 px: 19681-1424)
// Figma (Design system): E11 APP_CANCELLED_BY_APPLICANT · node-id=19681-1011 (360 px: 19681-1039)
// All under https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=<id>

// Preview data for `pnpm backend email:dev`: a term was confirmed, payment details follow.
ApplicationChange.PreviewProps = {
  locale: 'cs',
  eventName: 'Letní kemp Lipno 2027',
  organizationName: 'Alpine Collective',
  name: 'Adam Dvořák',
  termDates: '12.–18. 7. 2027',
  termName: null,
  kind: 'CONFIRMED',
  terms: [],
  payment: {
    amount: '4 900 Kč',
    bankAccount: '123456789/0800',
    variableSymbol: '2027001000',
    terms: [],
  },
  confirmationUrl: 'https://team-1.vsepractical.applifting.dev/apply/confirmation/preview-2',
} satisfies ApplicationChangeProps;

export default ApplicationChange;
