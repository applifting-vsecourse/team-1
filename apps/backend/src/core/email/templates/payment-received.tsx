import { Locale } from "@/core/email/locale"
import { ChangeLayout } from "@/core/email/templates/application-change-layout"
import * as React from "react"

// E-mail no. 8 (US-117): the debt of a confirmed term was paid. A plain confirmation of receipt,
// no amount, one per term. Figma: Potvrzení přijetí platby · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19681-1333
const copy: Record<
  Locale,
  {
    subject: (term: string) => string
    text: (name: string, term: string, event: string) => string
    button: string
    footer: (organization: string) => string
  }
> = {
  en: {
    subject: (term) => `Payment for ${term} received`,
    text: (name, term, event) =>
      `Hello ${name}, we have received your payment for ${term} at ${event}. You are all paid up and don't need to do anything else. You can check your application on the My application page:`,
    button: "My application",
    footer: (organization) => `${organization} · via Togena`,
  },
  cs: {
    subject: (term) => `Platba za termín ${term} byla přijata`,
    text: (name, term, event) =>
      `Dobrý den, ${name}, platbu za termín ${term} akce ${event} jsme přijali. Máte zaplaceno a nemusíte nic dalšího řešit. Stav přihlášky najdete na stránce Moje přihláška:`,
    button: "Moje přihláška",
    footer: (organization) => `${organization} · přes Togenu`,
  },
}

export const paymentReceivedSubject = (locale: Locale, termName: string): string =>
  copy[locale].subject(termName)

export interface PaymentReceivedEmailProps {
  locale: Locale
  eventName: string
  organizationName: string
  firstName: string
  /** The term in a sentence: its name, or its dates (`termLabel`). */
  termName: string
  confirmationUrl: string
}

export const PaymentReceivedEmail = ({
  locale,
  eventName,
  organizationName,
  firstName,
  termName,
  confirmationUrl,
}: PaymentReceivedEmailProps): React.JSX.Element => {
  const text = copy[locale]
  const subject = text.subject(termName)
  return (
    <ChangeLayout
      locale={locale}
      preview={subject}
      heading={subject}
      eventName={eventName}
      text={text.text(firstName, termName, eventName)}
      badge={null}
      details={[]}
      buttonLabel={text.button}
      buttonUrl={confirmationUrl}
      footer={text.footer(organizationName)}
    />
  )
}

PaymentReceivedEmail.PreviewProps = {
  locale: "cs",
  eventName: "Letní kemp 2027",
  organizationName: "Togena",
  firstName: "Jana",
  termName: "12.–18. 7. 2027",
  confirmationUrl: "https://example.com/apply/confirmation/example",
} satisfies PaymentReceivedEmailProps

export default PaymentReceivedEmail
