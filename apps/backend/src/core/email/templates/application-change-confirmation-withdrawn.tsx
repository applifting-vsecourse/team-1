import { Locale } from '@/core/email/locale';
import { ChangeLayout } from '@/core/email/templates/application-change-layout';
import { Gender } from '@/shared/domain/gender';
import * as React from 'react';

// Figma (Design system): US-116 E-mailová šablona · E-mail 13 (Potvrzení bylo odvoláno. Jste náhradník) · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15981-686 (360 px: node-id=15981-716)
// E-mail no. 13 (EMAILY.md, D-074): Potvrzená s dluhem → Náhradník, the organizer moves the
// application among the substitutes. Own template, not the one of no. 3 (K vyhodnocení → Náhradník).
// The waiting order is never told. Copy for both locales side by side.
const copy: Record<
  Locale,
  {
    subject: (event: string) => string;
    heading: string;
    text: (name: string, term: string, gender: Gender) => string;
    badge: string;
    button: string;
    footer: (organization: string) => string;
  }
> = {
  en: {
    subject: (event) => `Change in your application: ${event}`,
    heading: 'Your confirmation was withdrawn. You are a substitute',
    text: (name, term, gender) =>
      `The organiser withdrew the confirmation of ${name}’s place for ${term} and moved them among the substitutes. This is not waiting for the first evaluation.`,
    badge: 'Substitute',
    button: 'Open my applications',
    footer: (organization) => `${organization} · via Togena`,
  },
  cs: {
    subject: (event) => `Změna ve vaší přihlášce: ${event}`,
    heading: 'Potvrzení bylo odvoláno. Jste náhradník',
    text: (name, term, gender) =>
      `Organizátor odvolal potvrzení účasti (${name}) v termínu ${term} a zařadil ${gender === 'FEMALE' ? 'ji' : 'ho'} mezi náhradníky. Nejde o čekání na první vyhodnocení.`,
    badge: 'Náhradník',
    button: 'Otevřít moje přihlášky',
    footer: (organization) => `${organization} · přes Togenu`,
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
  /** Of the participant: the Czech copy is gendered. */
  gender: Gender;
  /** The changed term: its name, or its dates. */
  term: string;
  confirmationUrl: string;
}

export const ConfirmationWithdrawn = ({
  locale,
  eventName,
  organizationName,
  name,
  gender,
  term,
  confirmationUrl,
}: ConfirmationWithdrawnProps): React.JSX.Element => {
  const text = copy[locale];
  return (
    <ChangeLayout
      locale={locale}
      preview={text.heading}
      heading={text.heading}
      eventName={eventName}
      text={text.text(name, term, gender)}
      badge={{ label: text.badge, tone: 'neutral' }}
      details={[]}
      buttonLabel={text.button}
      buttonUrl={confirmationUrl}
      footer={text.footer(organizationName)}
    />
  );
};

ConfirmationWithdrawn.PreviewProps = {
  locale: 'cs',
  eventName: 'Letní kemp Lipno 2027',
  organizationName: 'Alpine Collective',
  name: 'Adam Dvořák',
  gender: 'MALE',
  term: '12.–18. 7. 2027',
  confirmationUrl: 'https://team-1.vsepractical.applifting.dev/apply/confirmation/preview-2',
} satisfies ConfirmationWithdrawnProps;

export default ConfirmationWithdrawn;
