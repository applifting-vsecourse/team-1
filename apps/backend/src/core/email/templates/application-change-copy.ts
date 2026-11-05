import { Locale } from "@/core/email/locale"
import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"

/** Wording shared by the e-mails about a change of one application (docs/emaily/TEXTY.md). */
export const changeCommon: Record<
  Locale,
  {
    labels: { event: string; participant: string; term: string }
    /** Result of a term in the summary of changes (E13). */
    statuses: Record<ApplicationTermStatus, string>
    amountDue: string
    account: string
    variableSymbol: string
    applicationSymbol: string
    termSymbol: (term: string) => string
    button: string
    footer: (organization: string) => string[]
  }
> = {
  en: {
    labels: { event: "Event", participant: "Participant", term: "Term" },
    statuses: {
      TO_EVALUATE: "Awaiting review · do not pay yet",
      CONFIRMED: "Place confirmed",
      WAITLISTED: "Waitlisted · do not pay yet",
      CANCELLED: "Cancelled",
    },
    amountDue: "Amount due",
    account: "Bank account",
    variableSymbol: "Variable symbol",
    applicationSymbol: "Variable symbol of the whole application",
    termSymbol: (term) => `Variable symbol of the term · ${term}`,
    button: "View application",
    footer: (organization) => [
      `${organization} · via Togena`,
      "Questions about your application, attendance or payment: organizator@togena.com",
    ],
  },
  cs: {
    labels: { event: "Akce", participant: "Účastník", term: "Termín" },
    statuses: {
      TO_EVALUATE: "Čeká na vyhodnocení · zatím neplaťte",
      CONFIRMED: "Účast potvrzena",
      WAITLISTED: "Náhradník · zatím neplaťte",
      CANCELLED: "Zrušená",
    },
    amountDue: "K úhradě",
    account: "Bankovní účet",
    variableSymbol: "Variabilní symbol",
    applicationSymbol: "VS celé přihlášky",
    termSymbol: (term) => `VS termínu · ${term}`,
    button: "Zobrazit přihlášku",
    footer: (organization) => [
      `${organization} · prostřednictvím Togeny`,
      "Dotazy k přihlášce, účasti nebo platbě: organizator@togena.com",
    ],
  },
}

/** The term in the identification block: dates, with the organizer's name for the term if any. */
export const termValue = (dates: string, name: string | null): string =>
  name ? `${dates} · ${name}` : dates
