import { Locale } from '@/core/email/locale';
import { ChangeLayout } from '@/core/email/templates/application-change-layout';
import { Gender } from '@/shared/domain/gender';
import * as React from 'react';

// Figma (Design system): US-116 E-mailová šablona · E-mail 15 (Termín akce byl zrušen) · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15981-806 (360 px: node-id=15981-836)
// E-mail no. 15 (EMAILY.md, D-065, D-076, D-080): the organizer cancelled the term and the
// application in it is cancelled; paid payments are refunded. One e-mail per application.
// The cancellation of a term (US-131) sends it, see ApplicationConfirmationMailer.sendTermCancelled.
const copy: Record<
  Locale,
  {
    subject: (event: string) => string;
    heading: string;
    preview: string;
    text: (name: string, term: string, gender: Gender) => string;
    badge: string;
    button: string;
    footer: (organization: string) => string;
  }
> = {
  en: {
    subject: (event) => `Event term cancelled: ${event}`,
    heading: 'The event term has been cancelled',
    preview: 'The organiser has cancelled the event term and the application for it.',
    text: (name, term) =>
      `The organiser has cancelled the event term shown below (${term}). The application of ${name} for this term has therefore been cancelled. Any payments already made for the cancelled term are to be refunded. The organisation will let you know the next steps.`,
    badge: 'Cancelled',
    button: 'Open my applications',
    footer: (organization) => `${organization} · via Togena`,
  },
  cs: {
    subject: (event) => `Termín akce zrušen: ${event}`,
    heading: 'Termín akce byl zrušen',
    preview: 'Organizátor zrušil termín akce a přihlášku v tomto termínu.',
    text: (name, term) =>
      `Organizátor zrušil uvedený termín akce (${term}). Přihláška (${name}) v tomto termínu je proto zrušená. Případné platby za zrušený termín se vrací. Další postup vám sdělí organizace.`,
    badge: 'Zrušená',
    button: 'Otevřít moje přihlášky',
    footer: (organization) => `${organization} · přes Togenu`,
  },
};

export const termCancelledSubject = (locale: Locale, eventName: string): string =>
  copy[locale].subject(eventName);

export interface TermCancelledProps {
  locale: Locale;
  eventName: string;
  organizationName: string;
  /** First and last name of the participant. */
  name: string;
  /** Of the participant: the Czech copy is gendered. */
  gender: Gender;
  /** The cancelled term: its name, or its dates. */
  term: string;
  confirmationUrl: string;
}

export const TermCancelled = ({
  locale,
  eventName,
  organizationName,
  name,
  gender,
  term,
  confirmationUrl,
}: TermCancelledProps): React.JSX.Element => {
  const text = copy[locale];
  return (
    <ChangeLayout
      locale={locale}
      preview={text.preview}
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

TermCancelled.PreviewProps = {
  locale: 'cs',
  eventName: 'Letní kemp Lipno 2027',
  organizationName: 'Alpine Collective',
  name: 'Adam Dvořák',
  gender: 'MALE',
  term: '12.–18. 7. 2027',
  confirmationUrl: 'https://team-1.vsepractical.applifting.dev/apply/confirmation/preview-2',
} satisfies TermCancelledProps;

export default TermCancelled;
