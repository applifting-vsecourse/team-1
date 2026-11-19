import {
  ApplicationEmailFooter,
  EmailAction,
  EmailFallbackLink,
  EmailIdentification,
  EmailLayout,
  EmailRows,
  EmailTerm,
} from "@/core/email/email-kit"
import type { Locale } from "@/core/email/locale"
import { Fragment } from "react"
import { Heading, Section, Text } from "react-email"

const copy: Record<
  Locale,
  {
    subject: (event: string) => string
    preview: string
    heading: { one: string; many: string }
    intro: { one: (event: string, termCount: number) => string; many: (event: string) => string }
    badge: Record<"TO_EVALUATE" | "CONFIRMED" | "WAITLISTED", string>
    termText: Record<"TO_EVALUATE" | "CONFIRMED" | "WAITLISTED", string>
    amountDue: string
    account: string
    variableSymbol: string
    applicationSymbol: string
    termSymbol: (term: string) => string
    viewApplication: string
    severalPayments: string
    magicLinkNote: string
    magicLinkButton: string
    loginButton: string
    fallback: string
  }
> = {
  en: {
    subject: (event) => `Application received: ${event}`,
    preview: "Your submitted applications and the status of each term.",
    heading: {
      one: "We have received your application",
      many: "We have received your applications",
    },
    intro: {
      one: (event, termCount) =>
        `We have received your application for ${event}. ${termCount === 1 ? "Below is the participant and the status of the selected term." : "Below is a summary of the participant and the status of each term."}`,
      many: (event) =>
        `We have received your applications for ${event}. Below is a summary of the participants and the status of each term.`,
    },
    badge: {
      TO_EVALUATE: "Awaiting review",
      CONFIRMED: "Place confirmed",
      WAITLISTED: "Waitlisted",
    },
    termText: {
      TO_EVALUATE:
        "Awaiting review. We will let you know the result by e-mail. Please do not pay yet.",
      CONFIRMED: "The place is confirmed. Payment details are shown below.",
      WAITLISTED:
        "The application is waitlisted. We will e-mail you if the place is confirmed. Please do not pay yet.",
    },
    amountDue: "Amount due",
    account: "Bank account",
    variableSymbol: "Variable symbol",
    applicationSymbol: "Variable symbol of the whole application",
    termSymbol: (term) => `Variable symbol of the term · ${term}`,
    viewApplication: "View application",
    severalPayments:
      "Please pay only for confirmed terms. Pay for each application separately using the amount and variable symbol shown.",
    magicLinkNote:
      "The link is valid for 7 days and can only be used once. If it no longer works, you can request a new one on the Togena sign-in page.",
    magicLinkButton: "Sign in to Togena",
    loginButton: "Sign in to Togena",
    fallback: "If the button does not work, copy this link into your browser:",
  },
  cs: {
    subject: (event) => `Přihláška přijata: ${event}`,
    preview: "Přehled přijatých přihlášek a stavů jednotlivých termínů.",
    heading: { one: "Přihlášku jsme přijali", many: "Přihlášky jsme přijali" },
    intro: {
      one: (event, termCount) =>
        `Přijali jsme vaši přihlášku na akci ${event}. Níže najdete přehled účastníka a stav ${termCount === 1 ? "jednotlivého termínu" : "jednotlivých termínů"}.`,
      many: (event) =>
        `Přijali jsme vaše přihlášky na akci ${event}. Níže najdete přehled účastníků a stav jednotlivých termínů.`,
    },
    badge: {
      TO_EVALUATE: "Čeká na vyhodnocení",
      CONFIRMED: "Účast potvrzena",
      WAITLISTED: "Náhradník",
    },
    termText: {
      TO_EVALUATE: "Čeká na vyhodnocení. O výsledku vás informujeme e-mailem. Zatím nic neplaťte.",
      CONFIRMED: "Účast je potvrzená. Platební údaje najdete níže.",
      WAITLISTED:
        "Přihláška je zařazena mezi náhradníky. Pokud bude účast potvrzena, informujeme vás e-mailem. Zatím nic neplaťte.",
    },
    amountDue: "K úhradě",
    account: "Bankovní účet",
    variableSymbol: "Variabilní symbol",
    applicationSymbol: "VS celé přihlášky",
    termSymbol: (term) => `VS termínu · ${term}`,
    viewApplication: "Zobrazit přihlášku",
    severalPayments:
      "Plaťte pouze za potvrzené termíny. Každou přihlášku zaplaťte samostatně podle uvedené částky a variabilního symbolu.",
    magicLinkNote:
      "Odkaz platí 7 dní a lze jej použít pouze jednou. Pokud už nefunguje, na přihlašovací stránce Togeny si můžete nechat poslat nový.",
    magicLinkButton: "Přihlásit se do Togeny",
    loginButton: "Přihlásit se do Togeny",
    fallback: "Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:",
  },
}

export const applicationConfirmationSubject = (locale: Locale, eventName: string): string =>
  copy[locale].subject(eventName)

export interface ConfirmationApplicationProps {
  /** First and last name of the participant. */
  name: string
  terms: { name: string; dates?: string; status: "TO_EVALUATE" | "CONFIRMED" | "WAITLISTED" }[]
  /** Only for an application with a confirmed term; amounts are already formatted. */
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

export interface ApplicationConfirmationProps {
  locale: Locale
  eventName: string
  organizationName: string
  /** Magic link (account without a password) or the sign-in page. */
  access: { kind: "MAGIC_LINK" | "LOGIN"; url: string }
  applications: ConfirmationApplicationProps[]
}

const tones = { TO_EVALUATE: "neutral", CONFIRMED: "confirmed", WAITLISTED: "waitlisted" } as const

// Figma: E01–E04 · Přijetí přihlášky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19680-512
export function ApplicationConfirmation({
  locale,
  eventName,
  organizationName,
  access,
  applications,
}: ApplicationConfirmationProps) {
  const text = copy[locale]
  const single = applications.length === 1
  const magicLink = access.kind === "MAGIC_LINK"
  return (
    <EmailLayout
      locale={locale}
      preview={text.preview}
      heading={single ? text.heading.one : text.heading.many}
      introduction={
        <Text className="mb-0 mt-6 text-base leading-6 text-ink">
          {single
            ? text.intro.one(eventName, applications[0].terms.length)
            : text.intro.many(eventName)}
        </Text>
      }
    >
      {magicLink ? (
        <EmailAction
          href={access.url}
          first
        >
          {text.magicLinkButton}
        </EmailAction>
      ) : null}
      <Section className={magicLink ? "mt-6" : undefined}>
        <EmailIdentification
          locale={locale}
          eventName={eventName}
          participant={single ? applications[0].name : undefined}
        />
      </Section>
      {applications.map(({ confirmationUrl, name, terms, payment }) => (
        <Fragment key={confirmationUrl}>
          {single ? null : (
            <Heading
              as="h2"
              className="mb-0 mt-6 text-[18px] font-semibold leading-[26px] tracking-[-0.18px] text-ink"
            >
              {name}
            </Heading>
          )}
          <Section className="mt-6">
            {terms.map((term, index) => (
              <EmailTerm
                key={index}
                dates={term.dates ?? term.name}
                name={term.dates && term.name !== term.dates ? term.name : undefined}
                tone={tones[term.status]}
                badge={text.badge[term.status]}
                description={text.termText[term.status]}
                last={index === terms.length - 1}
              />
            ))}
          </Section>
          {payment ? (
            <EmailRows
              spaced
              rows={[
                { label: text.amountDue, value: payment.amount },
                { label: text.account, value: payment.bankAccount },
                {
                  label: payment.terms.length ? text.applicationSymbol : text.variableSymbol,
                  value: payment.variableSymbol,
                },
                ...payment.terms.map((term) => ({
                  label: text.termSymbol(term.name),
                  value: `${term.amount} · ${term.variableSymbol}`,
                })),
              ]}
            />
          ) : null}
          <EmailAction
            href={confirmationUrl}
            secondary={!single || magicLink}
          >
            {text.viewApplication}
          </EmailAction>
        </Fragment>
      ))}
      {applications.length > 1 && applications.some((a) => a.payment) ? (
        <Text className="mb-0 mt-6 text-sm leading-5 text-muted">{text.severalPayments}</Text>
      ) : null}
      {magicLink ? (
        <>
          <Text className="mb-0 mt-6 text-sm leading-5 text-muted">{text.magicLinkNote}</Text>
          <EmailFallbackLink
            url={access.url}
            label={text.fallback}
          />
        </>
      ) : (
        <EmailAction
          href={access.url}
          secondary={single}
        >
          {text.loginButton}
        </EmailAction>
      )}
      <ApplicationEmailFooter
        locale={locale}
        organization={organizationName}
      />
    </EmailLayout>
  )
}

// Preview data for `pnpm backend email:dev`: one participant, new account.
ApplicationConfirmation.PreviewProps = {
  locale: "cs",
  eventName: "Letní kemp 2027",
  organizationName: "Alpine Collective",
  access: {
    kind: "MAGIC_LINK",
    url: "https://team-1.vsepractical.applifting.dev/participant/magic-link?token=preview",
  },
  applications: [
    {
      name: "Jana Nováková",
      terms: [
        { name: "1. týden", dates: "12.–18. 7. 2027", status: "CONFIRMED" },
        { name: "2. týden", dates: "19.–25. 7. 2027", status: "WAITLISTED" },
      ],
      payment: {
        amount: "4 500 Kč",
        bankAccount: "2900123456/2010",
        variableSymbol: "48000",
        terms: [],
      },
      confirmationUrl: "https://team-1.vsepractical.applifting.dev/apply/confirmation/preview-1",
    },
  ],
} satisfies ApplicationConfirmationProps

export default ApplicationConfirmation
