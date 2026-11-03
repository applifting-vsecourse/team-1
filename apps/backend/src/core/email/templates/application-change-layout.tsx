import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from 'react-email';
import * as React from 'react';
import { Locale } from '@/core/email/locale';

/**
 * The one layout of the e-mails about a changed application (US-116, EMAILY.md rows 2 to 6, 9 to 11
 * and 13 to 15): logo, heading, event, one sentence, status badge, optional payment details,
 * button, organization footer. Every template passes only its copy.
 */
export interface ChangeLayoutProps {
  locale: Locale;
  preview: string;
  heading: string;
  eventName: string;
  /** The sentence about the change. */
  text: string;
  badge: { label: string; tone: 'positive' | 'neutral' };
  /** Label–value pairs under the badge (payment details); empty when there are none. */
  details: { label: string; value: string }[];
  buttonLabel: string;
  buttonUrl: string;
  /** `<organization> · přes Togenu`. */
  footer: string;
}

export const ChangeLayout = ({
  locale,
  preview,
  heading,
  eventName,
  text,
  badge,
  details,
  buttonLabel,
  buttonUrl,
  footer,
}: ChangeLayoutProps): React.JSX.Element => (
  <Html lang={locale}>
    <Head />
    <Preview>{preview}</Preview>
    <Tailwind>
      <Body className="bg-[#f6f9f8] font-sans py-8">
        <Container className="bg-white mx-auto px-8 py-6 max-w-[640px]">
          <Text className="text-[#102e31] text-lg font-bold m-0">togena</Text>
          <Heading className="text-[#102e31] text-[32px] leading-10 font-bold mt-6 mb-0">
            {heading}
          </Heading>
          <Text className="text-[#102e31] text-base leading-6 mt-6 mb-0">
            {eventName}
          </Text>
          <Text className="text-[#102e31] text-base leading-6 mt-6 mb-0">
            {text}
          </Text>
          <Section className="mt-6">
            <span
              className={
                badge.tone === 'positive'
                  ? 'bg-[#dbefe7] text-[#006c60] text-sm font-medium rounded-full px-2 py-1'
                  : 'bg-[#eef6f2] text-[#4d6565] text-sm font-medium rounded-full px-2 py-1'
              }
            >
              {badge.label}
            </span>
          </Section>
          {details.map((detail) => (
            <Section
              key={`${detail.label}-${detail.value}`}
              className="mt-6"
            >
              <Text className="text-[#4d6565] text-sm leading-5 m-0">
                {detail.label}
              </Text>
              <Text className="text-[#102e31] text-base leading-6 mt-2 mb-0">
                {detail.value}
              </Text>
            </Section>
          ))}
          <Section className="mt-6">
            <Button
              href={buttonUrl}
              className="bg-[#006c60] text-white text-sm font-medium rounded-[10px] px-4 py-2 box-border w-full text-center"
            >
              {buttonLabel}
            </Button>
          </Section>
          <Text className="text-[#4d6565] text-sm leading-5 mt-6 mb-0">
            {footer}
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

// Only so that `pnpm backend email:dev` can list this file; the previews are the templates.
ChangeLayout.PreviewProps = {
  locale: 'cs',
  preview: 'Náhled',
  heading: 'Změna přihlášky',
  eventName: 'Letní kemp Lipno 2027',
  text: 'Text o změně.',
  badge: { label: 'Zrušená', tone: 'neutral' },
  details: [],
  buttonLabel: 'Otevřít moje přihlášky',
  buttonUrl: 'https://team-1.vsepractical.applifting.dev/apply/confirmation/preview',
  footer: 'Alpine Collective · přes Togenu',
} satisfies ChangeLayoutProps;

export default ChangeLayout;
