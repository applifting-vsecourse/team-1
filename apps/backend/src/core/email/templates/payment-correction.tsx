import { changeMessages } from "@/core/email/change-messages"
import { formatCzk } from "@/core/email/format-czk"
import { Locale } from "@/core/email/locale"
import { ChangeLayout } from "@/core/email/templates/application-change-layout"
import * as React from "react"

// E-mail no. 16 (US-112): a paid confirmed term has a debt after a payment correction or removal.
export const paymentCorrectionSubject = (locale: Locale, eventName: string): string =>
  changeMessages[locale].CORRECTED.subject(eventName)

export interface PaymentCorrectionEmailProps {
  locale: Locale
  eventName: string
  organizationName: string
  name: string
  amountOwedCzk: number
  bankAccount: string
  debts: {
    termNumber: number
    termLabel?: string
    amountCzk: number
    variableSymbol: string
    paymentDueAt: Date | null
  }[]
  confirmationUrl: string
}

// Figma: E16 · Oprava platby · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19681-1387
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
  const text =
    locale === "cs"
      ? {
          amount: "K úhradě",
          account: "Bankovní účet",
          term: "Termín",
          symbol: "Variabilní symbol termínu",
          due: "Zaplaťte do",
        }
      : {
          amount: "Amount due",
          account: "Bank account",
          term: "Term",
          symbol: "Variable symbol of the term",
          due: "Pay by",
        }
  return (
    <ChangeLayout
      locale={locale}
      message={changeMessages[locale].CORRECTED}
      eventName={eventName}
      participant={name}
      termLabel={debts.map((debt) => debt.termLabel ?? String(debt.termNumber)).join(" · ")}
      organizationName={organizationName}
      details={[
        { label: text.amount, value: formatCzk(amountOwedCzk, locale) },
        { label: text.account, value: bankAccount },
        ...debts.flatMap((debt) => [
          ...(debts.length > 1
            ? [
                {
                  label: `${text.term} ${debt.termNumber} · ${text.amount}`,
                  value: formatCzk(debt.amountCzk, locale),
                },
              ]
            : []),
          {
            label:
              debts.length > 1 ? `${text.term} ${debt.termNumber} · ${text.symbol}` : text.symbol,
            value: debt.variableSymbol,
          },
          ...(debt.paymentDueAt
            ? [
                {
                  label:
                    debts.length > 1 ? `${text.term} ${debt.termNumber} · ${text.due}` : text.due,
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
      buttonUrl={confirmationUrl}
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
      termLabel: "12.–18. 7. 2027",
      amountCzk: 1200,
      variableSymbol: "12345001",
      paymentDueAt: new Date("2027-06-20T12:00:00Z"),
    },
  ],
  confirmationUrl: "https://example.com/apply/confirmation/example",
} satisfies PaymentCorrectionEmailProps

export default PaymentCorrectionEmail
