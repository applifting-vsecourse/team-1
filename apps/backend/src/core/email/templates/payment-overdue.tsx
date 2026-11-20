import {
  ApplicationEmailFooter,
  EmailAction,
  EmailIdentification,
  EmailLayout,
  EmailRows,
  paymentLabels,
} from "@/core/email/email-kit"
import { formatCzk } from "@/core/email/format-czk"
import type { Locale } from "@/core/email/locale"
import { Text } from "react-email"

const copy = {
  cs: {
    subject: (event: string) => `Výzva k zaplacení: ${event}`,
    preview: "Uplynula lhůta pro zaplacení. Zkontrolujte zbývající částku.",
    heading: "Zbývá zaplatit",
    body: "U přihlášky v uvedeném termínu uplynula lhůta pro zaplacení a evidujeme nedoplatek. Zaplaťte prosím zbývající částku podle údajů níže.",
    button: "Zobrazit přihlášku",
  },
  en: {
    subject: (event: string) => `Payment overdue: ${event}`,
    preview: "The payment deadline has passed. Please check the outstanding amount.",
    heading: "Payment is outstanding",
    body: "The payment deadline for the application in the term shown below has passed and an amount remains outstanding. Please pay the outstanding amount using the details below.",
    button: "View application",
  },
} satisfies Record<Locale, object>

export const paymentOverdueSubject = (locale: Locale, eventName: string): string =>
  copy[locale].subject(eventName)

interface Debt {
  termLabel: string
  amountCzk: number
  variableSymbol: string
}

interface PaymentOverdueProps {
  locale: Locale
  eventName: string
  participant: string
  organizationName: string
  organizerEmail: string
  applicationUrl: string
  /** The payments domain supplies the outstanding balance and both levels of reference. */
  amountDueCzk: number
  bankAccount: string
  applicationSymbol: string
  terms: [Debt, ...Debt[]]
}

// Figma: E14 PAYMENT_OVERDUE · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19681-1259 (mobile 19681-1296).
export function PaymentOverdue(props: PaymentOverdueProps) {
  const {
    locale,
    eventName,
    participant,
    organizationName,
    organizerEmail,
    applicationUrl,
    amountDueCzk,
    bankAccount,
    applicationSymbol,
    terms,
  } = props
  const text = copy[locale]
  const pay = paymentLabels[locale]
  return (
    <EmailLayout
      locale={locale}
      preview={text.preview}
      heading={text.heading}
      introduction={<Text className="mb-0 mt-6 text-base leading-6 text-ink">{text.body}</Text>}
    >
      <EmailIdentification
        locale={locale}
        eventName={eventName}
        participant={participant}
        term={terms.map(({ termLabel }) => termLabel).join(" · ")}
      />
      <EmailRows
        spaced
        rows={[
          { label: pay.amountDue, value: formatCzk(amountDueCzk, locale) },
          { label: pay.account, value: bankAccount },
          {
            label: terms.length > 1 ? pay.applicationSymbol : pay.variableSymbol,
            value: applicationSymbol,
          },
          ...(terms.length > 1
            ? terms.flatMap(({ termLabel, amountCzk, variableSymbol }) => [
                { label: `${termLabel} · ${pay.amountDue}`, value: formatCzk(amountCzk, locale) },
                { label: pay.termSymbol(termLabel), value: variableSymbol },
              ])
            : []),
        ]}
      />
      <EmailAction href={applicationUrl}>{text.button}</EmailAction>
      <ApplicationEmailFooter
        locale={locale}
        organization={organizationName}
        contact={organizerEmail}
      />
    </EmailLayout>
  )
}

PaymentOverdue.PreviewProps = {
  locale: "cs",
  eventName: "Letní kemp Lipno 2027",
  participant: "Adam Dvořák",
  organizationName: "Alpine Collective",
  organizerEmail: "organizator@togena.com",
  applicationUrl: "https://example.com/apply/confirmation/preview",
  amountDueCzk: 2400,
  bankAccount: "123456789/0800",
  applicationSymbol: "2027001000",
  terms: [{ termLabel: "12.–18. 7. 2027", amountCzk: 2400, variableSymbol: "2027001001" }],
} satisfies PaymentOverdueProps

export default PaymentOverdue
