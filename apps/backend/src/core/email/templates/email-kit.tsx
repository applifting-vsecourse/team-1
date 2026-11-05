import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Column,
  Section,
  Tailwind,
  Text,
} from 'react-email';
import { Locale } from '@/core/email/locale';

/**
 * The shared building blocks of every e-mail in the current design (docs/emaily, Figma
 * "HF / 09 E-maily · nový design"): grey canvas, white card, logo, heading, button, alert and
 * footer. Colours are the design tokens as literals, because e-mail clients ignore CSS variables.
 */
export const EMAIL_COLORS = {
  canvas: '#f9fdff',
  surface: '#ffffff',
  border: '#dae3e4',
  textPrimary: '#031a1e',
  textSecondary: '#50686d',
  textLink: '#006363',
  accent: '#007f72',
  warning: '#8a4b0e',
  warningBg: '#fff5e6',
} as const;

export interface EmailShellProps {
  locale: Locale;
  preview: string;
  children: React.ReactNode;
}

export const EmailShell = ({ locale, preview, children }: EmailShellProps): React.JSX.Element => (
  <Html lang={locale}>
    <Tailwind>
      <Head>
        {/* 360 px frames: 16 px canvas around the card and 16 px card padding. The paddings sit
            on table cells, so they are reached by selector. */}
        <style>{`@media (max-width:480px){.tg-body>table>tbody>tr>td{padding:16px !important}.tg-card>tbody>tr>td{padding-left:16px !important;padding-right:16px !important}}`}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body className="tg-body bg-[#f9fdff] font-sans py-12 max-[480px]:py-4">
        <Container className="tg-card bg-white mx-auto px-8 py-8 max-w-[640px] rounded-xl border border-solid border-[#dae3e4]">
          {children}
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export const EmailLogo = (): React.JSX.Element => (
  <Text className="text-[#031a1e] text-[30px] leading-none font-bold m-0">togena</Text>
);

export const EmailHeading = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <Heading className="text-[#031a1e] text-2xl leading-8 font-semibold mt-6 mb-0">
    {children}
  </Heading>
);

export const EmailText = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <Text className="text-[#031a1e] text-base leading-6 mt-6 mb-0">{children}</Text>
);

export const EmailNote = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <Text className="text-[#50686d] text-sm leading-5 mt-6 mb-0">{children}</Text>
);

export const EmailButton = ({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: React.ReactNode;
  /** `secondary` is the outlined button next to a primary action (one primary per context). */
  variant?: 'primary' | 'secondary';
}): React.JSX.Element => (
  <Section className="mt-6">
    <Button
      href={href}
      className={
        variant === 'primary'
          ? 'bg-[#007f72] text-white text-sm font-medium rounded-lg px-4 py-3 box-border w-full text-center'
          : 'bg-white text-[#031a1e] text-sm font-medium rounded-lg px-4 py-3 box-border w-full text-center border border-solid border-[#759398]'
      }
    >
      {children}
    </Button>
  </Section>
);

/** A label above a value (event, participant, amount due, account…). */
export const EmailRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element => (
  <Section className="mt-3 first:mt-0">
    <Text className="text-[#50686d] text-xs leading-[18px] font-medium m-0">{label}</Text>
    <Text className="text-[#031a1e] text-base leading-6 mt-[2px] mb-0">{value}</Text>
  </Section>
);

/** A block between two hairlines: the identification of an application, payment details. */
export const EmailRuledBlock = ({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element => (
  <Section className="mt-6 border-solid border-[#dae3e4] border-x-0 border-y py-4">
    {children}
  </Section>
);

export const EmailSubheading = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <Heading
    as="h2"
    className="text-[#031a1e] text-lg leading-[26px] font-semibold mt-6 mb-0"
  >
    {children}
  </Heading>
);

export type EmailBadgeTone = 'success' | 'waitlist' | 'neutral';

const BADGE_CLASS: Record<EmailBadgeTone, string> = {
  success: 'bg-[#eaf6f0] text-[#16634a]',
  waitlist: 'bg-[#f4efff] text-[#6941a5]',
  neutral: 'bg-[#eef3f4] text-[#50686d]',
};

/** One term of an application: dates, the optional name, the status badge and its sentence. */
export const EmailTerm = ({
  dates,
  name,
  badge,
  tone,
  text,
  last,
}: {
  dates: string;
  name: string | null;
  badge: string;
  tone: EmailBadgeTone;
  text: string;
  last: boolean;
}): React.JSX.Element => (
  <Section
    className={`py-4 ${last ? '' : 'border-solid border-[#dae3e4] border-x-0 border-t-0 border-b'}`}
  >
    <Row>
      <Column>
        <Text className="text-[#031a1e] text-lg leading-[26px] font-semibold m-0">{dates}</Text>
        {name ? (
          <Text className="text-[#50686d] text-xs leading-[18px] font-medium mt-[2px] mb-0">
            {name}
          </Text>
        ) : null}
      </Column>
      <Column align="right" className="align-top">
        <span
          className={`${BADGE_CLASS[tone]} text-xs leading-[18px] font-medium rounded-full px-2 py-1 whitespace-nowrap`}
        >
          {badge}
        </span>
      </Column>
    </Row>
    <Text className="text-[#50686d] text-sm leading-5 mt-2 mb-0">{text}</Text>
  </Section>
);

export const EmailAlert = ({
  title,
  description,
}: {
  title: string;
  description: string;
}): React.JSX.Element => (
  <Section className="mt-6 bg-[#fff5e6] border border-solid border-[#8a4b0e] rounded-xl p-4">
    <Text className="text-[#8a4b0e] text-sm leading-5 font-semibold m-0">{title}</Text>
    <Text className="text-[#8a4b0e] text-sm leading-5 mt-1 mb-0">{description}</Text>
  </Section>
);

/** The fallback link under the button, for clients that do not render it. */
export const EmailFallbackLink = ({
  label,
  url,
}: {
  label: string;
  url: string;
}): React.JSX.Element => (
  <Section className="mt-6">
    <Text className="text-[#50686d] text-xs leading-[18px] font-medium m-0">{label}</Text>
    <Text className="text-[#006363] text-xs leading-[18px] font-medium mt-1 mb-0 break-all">
      {url}
    </Text>
  </Section>
);

export const EmailFooter = ({ lines }: { lines: string[] }): React.JSX.Element => (
  <>
    <Hr className="border-solid border-[#dae3e4] border-t border-x-0 border-b-0 mt-6 mb-0" />
    <Section className="mt-4">
      {lines.map((line, index) => (
        <Text
          key={line}
          className={`text-[#50686d] text-xs leading-[18px] font-medium mb-0 ${index === 0 ? 'mt-0' : 'mt-1'}`}
        >
          {line}
        </Text>
      ))}
    </Section>
  </>
);
