import { Locale } from '@/core/email/locale';
import { ChangeLayout } from '@/core/email/templates/application-change-layout';
import { changeCommon, termValue } from '@/core/email/templates/application-change-copy';
import * as React from 'react';

// Figma (Design system): E09 APP_CONFIRMATION_WITHDRAWN · Odvolání potvrzení · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19681-903 (360 px: node-id=19681-930)
// E-mail no. 13 (docs/emaily/KATALOG.md, D-074): Potvrzená s dluhem → Náhradník, the organizer moves the
// application among the substitutes. Own template, not the one of no. 3 (K vyhodnocení → Náhradník).
// The waiting order is never told. Copy for both locales side by side; source: docs/emaily/TEXTY.md.
const copy: Record<
  Locale,
  { subject: (event: string) => string; preview: string; heading: string; text: string }
> = {
  en: {
    subject: (event) => `Place confirmation withdrawn: ${event}`,
    preview: 'The organiser has withdrawn the confirmation and waitlisted the application.',
    heading: 'The place confirmation has been withdrawn',
    text: 'The organiser has withdrawn the place confirmation for the term shown below and waitlisted the application. Please do not pay for this term yet. We will e-mail you if the place is confirmed again.',
  },
  cs: {
    subject: (event) => `Potvrzení účasti odvoláno: ${event}`,
    preview: 'Organizátor odvolal potvrzení a zařadil přihlášku mezi náhradníky.',
    heading: 'Potvrzení účasti bylo odvoláno',
    text: 'Organizátor odvolal potvrzení účasti v uvedeném termínu a zařadil přihlášku mezi náhradníky. Za tento termín zatím nic neplaťte. Pokud bude účast znovu potvrzena, informujeme vás e-mailem.',
  },
};

export const confirmationWithdrawnSubject = (locale: Locale, eventName: string): string =>
  copy[locale].subject(eventName);

export interface ConfirmationWithdrawnProps {
  locale: Locale;
  eventName: string;
  organizationName: string;
  /** First and last name of the participant. */
  name: string;
  /** The dates of the changed term, already formatted. */
  termDates: string;
  /** The name the organizer gave the term, if any. */
  termName: string | null;
  confirmationUrl: string;
}

export const ConfirmationWithdrawn = ({
  locale,
  eventName,
  organizationName,
  name,
  termDates,
  termName,
  confirmationUrl,
}: ConfirmationWithdrawnProps): React.JSX.Element => {
  const text = copy[locale];
  const common = changeCommon[locale];
  return (
    <ChangeLayout
      locale={locale}
      preview={text.preview}
      heading={text.heading}
      text={text.text}
      labels={common.labels}
      eventName={eventName}
      participantName={name}
      termValue={termValue(termDates, termName)}
      details={[]}
      note={null}
      buttonLabel={common.button}
      buttonUrl={confirmationUrl}
      footer={common.footer(organizationName)}
    />
  );
};

ConfirmationWithdrawn.PreviewProps = {
  locale: 'cs',
  eventName: 'Letní kemp Lipno 2027',
  organizationName: 'Alpine Collective',
  name: 'Adam Dvořák',
  termDates: '12.–18. 7. 2027',
  termName: null,
  confirmationUrl: 'https://team-1.vsepractical.applifting.dev/apply/confirmation/preview-2',
} satisfies ConfirmationWithdrawnProps;

export default ConfirmationWithdrawn;
