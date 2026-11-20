import { Section } from "react-email"
import { changeMessages } from "@/core/email/change-messages"
import { EmailTerm, paymentLabels } from "@/core/email/email-kit"
import type { Locale } from "@/core/email/locale"
import { ChangeLayout } from "@/core/email/templates/application-change-layout"
import type { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import type { Gender } from "@/shared/domain/gender"

export type ChangeKind =
  | "CONFIRMED"
  | "CONFIRMED_FROM_WAITLIST"
  | "WAITLISTED"
  | "REJECTED"
  | "CANCELLED"
  | "NO_BED_FREED"
  | "CANCELLED_BY_ORGANIZER"
  | "TERMS_CHANGED"
const messageOf = (locale: Locale, kind: ChangeKind) =>
  changeMessages[locale][kind === "CONFIRMED_FROM_WAITLIST" ? "CONFIRMED" : kind]
export const applicationChangeSubject = (
  locale: Locale,
  eventName: string,
  kind: ChangeKind,
): string => messageOf(locale, kind).subject(eventName)

export interface ApplicationChangeProps {
  locale: Locale
  eventName: string
  /** Name of the organization that runs the event, for the footer. */
  organizationName: string
  /** First and last name of the participant. */
  name: string
  /** Participant gender carried by the change notification. */
  gender: Gender
  /** The changed term: its name, or its dates. */
  term: string
  hadPayment?: boolean
  kind: ChangeKind
  /** Result of each term when several terms changed in one request. */
  terms: { name: string; dates?: string; status: Exclude<ApplicationTermStatus, "ARCHIVED"> }[]
  /** Only when the application became confirmed; amounts are already formatted. */
  payment: {
    /** Everything due now, paid under the summary variable symbol (`…000`). */
    amount: string
    bankAccount: string
    variableSymbol: string
    /** One line per confirmed term with its own symbol; empty with a single confirmed term. */
    terms: { name: string; amount: string; variableSymbol: string }[]
  } | null
  confirmationUrl: string
}

const statusLabel = {
  cs: {
    TO_EVALUATE: "Čeká na vyhodnocení",
    CONFIRMED: "Účast potvrzena",
    WAITLISTED: "Náhradník",
    CANCELLED: "Zrušeno",
  },
  en: {
    TO_EVALUATE: "Awaiting review",
    CONFIRMED: "Place confirmed",
    WAITLISTED: "Waitlisted",
    CANCELLED: "Cancelled",
  },
}
const tones = {
  TO_EVALUATE: "neutral",
  CONFIRMED: "confirmed",
  WAITLISTED: "waitlisted",
  CANCELLED: "neutral",
} as const

// Figma: E05–E08, E10, E11 a E13 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19681-665
export function ApplicationChange({
  locale,
  eventName,
  organizationName,
  name,
  term,
  kind,
  terms,
  payment,
  confirmationUrl,
  hadPayment,
}: ApplicationChangeProps) {
  const cs = locale === "cs"
  const message = messageOf(locale, kind)
  const pay = paymentLabels[locale]
  const refundNote = cs
    ? "Informace o případném vrácení platby vám sdělí organizátor."
    : "The organiser will let you know about any possible refund."
  const descriptions = {
    CONFIRMED: payment
      ? changeMessages[locale].CONFIRMED.body
      : cs
        ? "Účast v uvedeném termínu byla potvrzena."
        : "The place in the term shown below has been confirmed.",
    WAITLISTED: changeMessages[locale].WAITLISTED.body,
    CANCELLED: changeMessages[locale].CANCELLED.body,
    TO_EVALUATE: cs
      ? "Čeká na vyhodnocení. O výsledku vás informujeme e-mailem. Zatím nic neplaťte."
      : "Awaiting review. We will let you know the result by e-mail. Please do not pay yet.",
  }
  return (
    <ChangeLayout
      locale={locale}
      eventName={eventName}
      participant={name}
      termLabel={kind === "TERMS_CHANGED" ? undefined : term}
      message={message}
      organizationName={organizationName}
      buttonUrl={confirmationUrl}
      note={hadPayment && (kind === "REJECTED" || kind === "CANCELLED") ? refundNote : undefined}
      details={
        payment
          ? [
              { label: pay.amountDue, value: payment.amount },
              { label: pay.account, value: payment.bankAccount },
              {
                label: payment.terms.length ? pay.applicationSymbol : pay.variableSymbol,
                value: payment.variableSymbol,
              },
              ...payment.terms.map((item) => ({
                label: pay.termSymbol(item.name),
                value: `${item.amount} · ${item.variableSymbol}`,
              })),
            ]
          : undefined
      }
    >
      {kind === "TERMS_CHANGED" && (
        <Section className="mt-6">
          {terms.map((item, index) => (
            <EmailTerm
              key={index}
              dates={item.dates ?? item.name}
              name={item.dates && item.dates !== item.name ? item.name : undefined}
              badge={statusLabel[locale][item.status]}
              tone={tones[item.status]}
              description={descriptions[item.status]}
              last={index === terms.length - 1}
            />
          ))}
        </Section>
      )}
    </ChangeLayout>
  )
}
// Preview data for `pnpm backend email:dev`: a term was confirmed, payment details follow.
ApplicationChange.PreviewProps = {
  locale: "cs",
  eventName: "Letní kemp Lipno 2027",
  organizationName: "Alpine Collective",
  name: "Adam Dvořák",
  gender: "MALE",
  term: "12.–18. 7. 2027",
  kind: "CONFIRMED",
  terms: [],
  payment: {
    amount: "4 900 Kč",
    bankAccount: "123456789 / 0000",
    variableSymbol: "2027001000",
    terms: [],
  },
  confirmationUrl: "https://team-1.vsepractical.applifting.dev/apply/confirmation/preview-2",
} satisfies ApplicationChangeProps

export default ApplicationChange
