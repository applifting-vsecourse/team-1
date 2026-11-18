import { Button, Section, Text } from "react-email"
import { emailButton, EmailLayout } from "@/core/email/email-kit"
import * as React from "react"
import { Locale } from "@/core/email/locale"

/**
 * The one layout of the e-mails about a changed application (US-116, EMAILY.md rows 2 to 6, 9 to 11
 * and 13 to 15): logo, heading, event, one sentence, status badge, optional payment details,
 * button, organization footer. Every template passes only its copy.
 */
export interface ChangeLayoutProps {
  locale: Locale
  preview: string
  heading: string
  eventName: string
  /** The sentence about the change. */
  text: string
  /** The status of the application in the term; null where no frame draws one. */
  badge: { label: string; tone: "positive" | "neutral" } | null
  /** Label–value pairs under the badge (payment details); empty when there are none. */
  details: { label: string; value: string }[]
  buttonLabel: string
  buttonUrl: string
  /** `<organization> · přes Togenu`. */
  footer: string
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
  <EmailLayout
    locale={locale}
    preview={preview}
    heading={heading}
    introduction={<Text className="text-ink text-base leading-6 mt-6 mb-0">{eventName}</Text>}
  >
    <Text className="text-ink text-base leading-6 mt-6 mb-0">{text}</Text>
    {badge ? (
      <Section className="mt-6">
        <span
          className={
            badge.tone === "positive"
              ? "bg-positive text-accent text-sm font-medium rounded-full px-2 py-1"
              : "bg-surface text-muted text-sm font-medium rounded-full px-2 py-1"
          }
        >
          {badge.label}
        </span>
      </Section>
    ) : null}
    {details.map((detail) => (
      <Section
        key={`${detail.label}-${detail.value}`}
        className="mt-6"
      >
        <Text className="text-muted text-sm leading-5 m-0">{detail.label}</Text>
        <Text className="text-ink text-base leading-6 mt-2 mb-0">{detail.value}</Text>
      </Section>
    ))}
    <Section className="mt-6">
      <Button
        href={buttonUrl}
        className={emailButton}
      >
        {buttonLabel}
      </Button>
    </Section>
    <Text className="text-muted text-sm leading-5 mt-6 mb-0">{footer}</Text>
  </EmailLayout>
)

// Only so that `pnpm backend email:dev` can list this file; the previews are the templates.
ChangeLayout.PreviewProps = {
  locale: "cs",
  preview: "Náhled",
  heading: "Změna přihlášky",
  eventName: "Letní kemp Lipno 2027",
  text: "Text o změně.",
  badge: { label: "Zrušená", tone: "neutral" },
  details: [],
  buttonLabel: "Otevřít moje přihlášky",
  buttonUrl: "https://team-1.vsepractical.applifting.dev/apply/confirmation/preview",
  footer: "Alpine Collective · přes Togenu",
} satisfies ChangeLayoutProps

export default ChangeLayout
