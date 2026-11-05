import { Locale } from '@/core/email/locale';
import { ChangeLayout } from '@/core/email/templates/application-change-layout';
import { changeCommon, termValue } from '@/core/email/templates/application-change-copy';
import * as React from 'react';

// Figma (Design system): E12 EVENT_TERM_CANCELLED · Zrušení termínu akce · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19681-1067 (360 px: node-id=19681-1095)
// E-mail no. 15 (EMAILY.md, D-065, D-076, D-080): the organizer cancelled the term and the
// application in it is cancelled; paid payments are refunded. One e-mail per application.
// The cancellation of a term (US-131) sends it; this story only provides the template.
// Source of the copy: docs/emaily/TEXTY.md.
const copy: Record<
  Locale,
  {
    subject: (event: string) => string;
    preview: string;
    heading: string;
    text: string;
    note: string;
  }
> = {
  en: {
    subject: (event) => `Event term cancelled: ${event}`,
    preview: 'The organiser has cancelled the event term and the application for it.',
    heading: 'The event term has been cancelled',
    text: 'The organiser has cancelled the event term shown below. The application for this term has therefore been cancelled.',
    note: 'Any payments already made for the cancelled term are to be refunded. The organisation will let you know the next steps.',
  },
  cs: {
    subject: (event) => `Termín akce zrušen: ${event}`,
    preview: 'Organizátor zrušil termín akce a přihlášku v tomto termínu.',
    heading: 'Termín akce byl zrušen',
    text: 'Organizátor zrušil uvedený termín akce. Přihláška v tomto termínu je proto zrušená.',
    note: 'Případné zaplacené platby za zrušený termín se vrací. Další postup vám sdělí organizace.',
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
  /** The dates of the cancelled term, already formatted. */
  termDates: string;
  /** The name the organizer gave the term, if any. */
  termName: string | null;
  confirmationUrl: string;
}

export const TermCancelled = ({
  locale,
  eventName,
  organizationName,
  name,
  termDates,
  termName,
  confirmationUrl,
}: TermCancelledProps): React.JSX.Element => {
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
      note={text.note}
      buttonLabel={common.button}
      buttonUrl={confirmationUrl}
      footer={common.footer(organizationName)}
    />
  );
};

TermCancelled.PreviewProps = {
  locale: 'cs',
  eventName: 'Letní kemp Lipno 2027',
  organizationName: 'Alpine Collective',
  name: 'Adam Dvořák',
  termDates: '12.–18. 7. 2027',
  termName: null,
  confirmationUrl: 'https://team-1.vsepractical.applifting.dev/apply/confirmation/preview-2',
} satisfies TermCancelledProps;

export default TermCancelled;
