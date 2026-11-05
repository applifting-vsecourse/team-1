import { Locale } from "@/core/email/locale"

/** Wording shared by the e-mails about a change of one application (docs/emaily/TEXTY.md). */
export const changeCommon: Record<
  Locale,
  {
    labels: { event: string; participant: string; term: string }
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
