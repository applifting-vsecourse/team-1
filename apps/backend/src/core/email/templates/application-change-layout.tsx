import * as React from 'react';
import { Locale } from '@/core/email/locale';
import {
  EmailButton,
  EmailFooter,
  EmailHeading,
  EmailLogo,
  EmailNote,
  EmailRow,
  EmailRuledBlock,
  EmailShell,
  EmailText,
} from './email-kit';

/**
 * The one layout of the e-mails about a change of one application in one term (docs/emaily,
 * Figma E05 to E12): heading and sentence, identification (event, participant, term), optional
 * payment details and note, button, organization footer. Every template passes only its copy.
 */
export interface ChangeLayoutProps {
  locale: Locale;
  preview: string;
  heading: string;
  /** The sentence about the change. */
  text: string;
  labels: { event: string; participant: string; term: string };
  eventName: string;
  participantName: string;
  /** The term in the identification block: its dates, with the name the organizer gave it. */
  termValue: string;
  /** Label–value pairs of the payment details; empty when there are none. */
  details: { label: string; value: string }[];
  /** A sentence under the identification (refund, payment details), if the frame has one. */
  note: string | null;
  buttonLabel: string;
  buttonUrl: string;
  footer: string[];
}

export const ChangeLayout = ({
  locale,
  preview,
  heading,
  text,
  labels,
  eventName,
  participantName,
  termValue,
  details,
  note,
  buttonLabel,
  buttonUrl,
  footer,
}: ChangeLayoutProps): React.JSX.Element => (
  <EmailShell locale={locale} preview={preview}>
    <EmailLogo />
    <EmailHeading>{heading}</EmailHeading>
    <EmailText>{text}</EmailText>
    <EmailRuledBlock>
      <EmailRow label={labels.event} value={eventName} />
      <EmailRow label={labels.participant} value={participantName} />
      {termValue ? <EmailRow label={labels.term} value={termValue} /> : null}
    </EmailRuledBlock>
    {details.length > 0 ? (
      <EmailRuledBlock>
        {details.map((detail) => (
          <EmailRow key={`${detail.label}-${detail.value}`} label={detail.label} value={detail.value} />
        ))}
      </EmailRuledBlock>
    ) : null}
    {note ? <EmailNote>{note}</EmailNote> : null}
    <EmailButton href={buttonUrl}>{buttonLabel}</EmailButton>
    <EmailFooter lines={footer} />
  </EmailShell>
);

// Only so that `pnpm backend email:dev` can list this file; the previews are the templates.
ChangeLayout.PreviewProps = {
  locale: 'cs',
  preview: 'Náhled',
  heading: 'Změna přihlášky',
  text: 'Text o změně.',
  labels: { event: 'Akce', participant: 'Účastník', term: 'Termín' },
  eventName: 'Letní kemp Lipno 2027',
  participantName: 'Adam Dvořák',
  termValue: '12.–18. 7. 2027',
  details: [],
  note: null,
  buttonLabel: 'Zobrazit přihlášku',
  buttonUrl: 'https://team-1.vsepractical.applifting.dev/apply/confirmation/preview',
  footer: [
    'Alpine Collective · prostřednictvím Togeny',
    'Dotazy k přihlášce, účasti nebo platbě: organizator@togena.com',
  ],
} satisfies ChangeLayoutProps;

export default ChangeLayout;
