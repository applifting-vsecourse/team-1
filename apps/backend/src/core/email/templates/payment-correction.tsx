import { formatCzk } from "@/core/email/format-czk"
import { Locale } from "@/core/email/locale"
import { ChangeLayout } from "@/core/email/templates/application-change-layout"
import * as React from "react"

// E-mail no. 16 (US-112): a paid confirmed term has a debt after a payment correction or removal.
// Text and visual approval are tracked in #260; this uses the existing change-email layout.
const copy: Record<
  Locale,
  {
    subject: (event: string) => string
    heading: string
    text: (name: string) => string
    amount: string
    account: string
    symbol: string
    term: string
    button: string
    footer: (organization: string) => string
  }
> = {
  en: {
    subject: (event) => `Payment correction: ${event}`,
    heading: "Your payment record was corrected",
    text: (name) => `A payment record for ${name} changed. There is now an amount left to pay.`,
    amount: "Amount left to pay",
    account: "Bank account",
    symbol: "Reference number",
    term: "Term",
    button: "Open my application",
    footer: (organization) => `${organization} · via Togena`,
  },
  cs: {
    subject: (event) => `Oprava platby: ${event}`,
    heading: "Platební záznam byl opraven",
    text: (name) =>
      `Platební záznam přihlášky (${name}) se změnil. Nyní zbývá doplatit uvedenou částku.`,
    amount: "Aktuální nedoplatek",
    account: "Číslo účtu",
    symbol: "Variabilní symbol",
    term: "Termín",
    button: "Otevřít přihlášku",
    footer: (organization) => `${organization} · přes Togenu`,
  },
}

export const paymentCorrectionSubject = (locale: Locale, eventName: string): string =>
  copy[locale].subject(eventName)

export interface PaymentCorrectionEmailProps {
  locale: Locale
  eventName: string
  organizationName: string
  name: string
  amountOwedCzk: number
  bankAccount: string
  debts: { termNumber: number; amountCzk: number; variableSymbol: string }[]
  confirmationUrl: string
}

export const PaymentCorrectionEmail = ({
  locale,
  eventName,
  organizationName,
  name,
  amountOwedCzk,
  bankAccount,
  debts,
  confirmationUrl,
}: PaymentCorrectionEmailProps): React.JSX.Element => {
  const text = copy[locale]
  return (
    <ChangeLayout
      locale={locale}
      preview={text.heading}
      heading={text.heading}
      eventName={eventName}
      text={text.text(name)}
      badge={{ label: text.amount, tone: "neutral" }}
      details={[
        { label: text.amount, value: formatCzk(amountOwedCzk, locale) },
        { label: text.account, value: bankAccount },
        ...debts.flatMap((debt) => [
          {
            label: `${text.term} ${debt.termNumber} · ${text.amount}`,
            value: formatCzk(debt.amountCzk, locale),
          },
          { label: `${text.term} ${debt.termNumber} · ${text.symbol}`, value: debt.variableSymbol },
        ]),
      ]}
      buttonLabel={text.button}
      buttonUrl={confirmationUrl}
      footer={text.footer(organizationName)}
    />
  )
}

PaymentCorrectionEmail.PreviewProps = {
  locale: "cs",
  eventName: "Letní kemp 2027",
  organizationName: "Togena",
  name: "Jana Nováková",
  amountOwedCzk: 1200,
  bankAccount: "123456789/2010",
  debts: [{ termNumber: 1, amountCzk: 1200, variableSymbol: "12345001" }],
  confirmationUrl: "https://example.com/apply/confirmation/example",
} satisfies PaymentCorrectionEmailProps

export default PaymentCorrectionEmail
