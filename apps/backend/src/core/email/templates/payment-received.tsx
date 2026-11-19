import type { Locale } from "@/core/email/locale"
import { changeMessages } from "@/core/email/change-messages"
import { ChangeLayout } from "@/core/email/templates/application-change-layout"

export const paymentReceivedSubject = (locale: Locale, eventName: string): string =>
  changeMessages[locale].SETTLED.subject(eventName)

export interface PaymentReceivedEmailProps {
  locale: Locale
  eventName: string
  organizationName: string
  participant: string
  /** The term in a sentence: its name, or its dates (`termLabel`). */
  termName: string
  confirmationUrl: string
}

// Figma: E15 · Přijetí platby · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19681-1333
export function PaymentReceivedEmail({
  locale,
  eventName,
  organizationName,
  participant,
  termName,
  confirmationUrl,
}: PaymentReceivedEmailProps) {
  return (
    <ChangeLayout
      locale={locale}
      message={changeMessages[locale].SETTLED}
      eventName={eventName}
      participant={participant}
      termLabel={termName}
      organizationName={organizationName}
      buttonUrl={confirmationUrl}
    />
  )
}

PaymentReceivedEmail.PreviewProps = {
  locale: "cs",
  eventName: "Letní kemp 2027",
  organizationName: "Togena",
  participant: "Jana Nováková",
  termName: "12.–18. 7. 2027",
  confirmationUrl: "https://example.com/apply/confirmation/example",
} satisfies PaymentReceivedEmailProps

export default PaymentReceivedEmail
