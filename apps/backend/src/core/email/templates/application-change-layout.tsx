import type { ReactNode } from "react"
import { Text } from "react-email"
import {
  ApplicationEmailFooter,
  EmailAction,
  EmailIdentification,
  EmailLayout,
  EmailRows,
} from "@/core/email/email-kit"
import type { Locale } from "@/core/email/locale"

export interface ChangeLayoutProps {
  locale: Locale
  message: { preview: string; heading: string; body: string }
  eventName: string
  participant: string
  termLabel?: string
  organizationName: string
  buttonUrl: string
  note?: string
  details?: { label: string; value: string }[]
  children?: ReactNode
}

// Figma: E05–E16 · Jednotlivé změny, souhrn a platby · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19681-665
export function ChangeLayout({
  locale,
  message,
  eventName,
  organizationName,
  participant,
  termLabel,
  note,
  details,
  buttonUrl,
  children,
}: ChangeLayoutProps) {
  return (
    <EmailLayout
      locale={locale}
      preview={message.preview}
      heading={message.heading}
      introduction={<Text className="mb-0 mt-6 text-base leading-6 text-ink">{message.body}</Text>}
    >
      <EmailIdentification
        locale={locale}
        eventName={eventName}
        participant={participant}
        term={termLabel}
      />
      {children}
      {note && <Text className="mb-0 mt-6 text-sm leading-5 text-muted">{note}</Text>}
      {details?.length ? (
        <EmailRows
          spaced
          rows={details}
        />
      ) : null}
      <EmailAction href={buttonUrl}>
        {locale === "cs" ? "Zobrazit přihlášku" : "View application"}
      </EmailAction>
      <ApplicationEmailFooter
        locale={locale}
        organization={organizationName}
      />
    </EmailLayout>
  )
}

ChangeLayout.PreviewProps = {
  locale: "cs",
  message: { preview: "Změna přihlášky", heading: "Změna přihlášky", body: "Text o změně." },
  eventName: "Letní kemp Lipno 2027",
  participant: "Adam Dvořák",
  organizationName: "Alpine Collective",
  buttonUrl: "https://example.com/apply/confirmation/preview",
} satisfies ChangeLayoutProps
export default ChangeLayout
