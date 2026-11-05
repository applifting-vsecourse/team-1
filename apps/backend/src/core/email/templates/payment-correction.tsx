import { formatCzk } from "@/core/email/format-czk"
import { Locale } from "@/core/email/locale"
import { changeCommon } from "@/core/email/templates/application-change-copy"
import { ChangeLayout } from "@/core/email/templates/application-change-layout"
import * as React from "react"

// E16 PAYMENT_CORRECTED (US-112): a paid confirmed term has a debt after a payment correction or removal.
// Figma (Design system): E16 PAYMENT_CORRECTED · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19681-1387 (360 px: 19681-1424)
// Copy of the message itself: docs/emaily/TEXTY.md (PAYMENT_CORRECTED). Labels, button and footer are shared.
const copy: Record<
  Locale,
  {
    subject: (event: string) => string
    preview: string
    heading: string
    text: string
    amount: string
    symbol: string
    term: string
    due: string
  }
> = {
  en: {
    subject: (event) => `Payment correction: outstanding balance for ${event}`,
    preview:
      "The previous confirmation of full payment is no longer valid. The outstanding amount is shown below.",
    heading: "An outstanding balance remains after a payment correction",
    text: "Following the organiser’s correction of the payment record, the amount shown below remains outstanding for the application in this term. The previous confirmation of full payment is no longer valid. Please pay the outstanding amount using the payment details provided.",
    amount: "Outstanding amount",
    symbol: "Variable symbol",
    term: "Term",
    due: "Pay by",
  },
  cs: {
    subject: (event) => `Po opravě platby zbývá doplatit: ${event}`,
    preview: "Předchozí potvrzení o úplném zaplacení již neplatí. Níže najdete částku k doplacení.",
    heading: "Po opravě platby zbývá nedoplatek",
    text: "Po opravě evidence platby organizátorem zbývá u přihlášky v uvedeném termínu doplatit částku uvedenou níže. Předchozí potvrzení o úplném zaplacení již neplatí. Uhraďte prosím nedoplatek podle uvedených platebních údajů.",
    amount: "Aktuální nedoplatek",
    symbol: "Variabilní symbol",
    term: "Termín",
    due: "Zaplaťte do",
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
  debts: {
    termNumber: number
    amountCzk: number
    variableSymbol: string
    paymentDueAt: Date | null
  }[]
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
  const common = changeCommon[locale]
  return (
    <ChangeLayout
      locale={locale}
      preview={text.preview}
      heading={text.heading}
      text={text.text}
      labels={common.labels}
      eventName={eventName}
      participantName={name}
      termValue=""
      details={[
        { label: text.amount, value: formatCzk(amountOwedCzk, locale) },
        { label: common.account, value: bankAccount },
        ...debts.flatMap((debt) => [
          {
            label: `${text.term} ${debt.termNumber} · ${text.amount}`,
            value: formatCzk(debt.amountCzk, locale),
          },
          { label: `${text.term} ${debt.termNumber} · ${text.symbol}`, value: debt.variableSymbol },
          ...(debt.paymentDueAt
            ? [
                {
                  label: `${text.term} ${debt.termNumber} · ${text.due}`,
                  value: new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "Europe/Prague",
                  }).format(debt.paymentDueAt),
                },
              ]
            : []),
        ]),
      ]}
      note={null}
      buttonLabel={common.button}
      buttonUrl={confirmationUrl}
      footer={common.footer(organizationName)}
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
  debts: [
    {
      termNumber: 1,
      amountCzk: 1200,
      variableSymbol: "12345001",
      paymentDueAt: new Date("2027-06-20T12:00:00Z"),
    },
  ],
  confirmationUrl: "https://example.com/apply/confirmation/example",
} satisfies PaymentCorrectionEmailProps

export default PaymentCorrectionEmail
