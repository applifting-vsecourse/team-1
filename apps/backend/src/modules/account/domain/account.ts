import { Locale } from "@/core/email/locale"
import { AccountType } from "@/shared/auth/domain/identity"

export type OrganizationSummary = {
  id: string
  name: string
}

export type Account = {
  id: string
  email: string
  name: string | null
  accountType: AccountType
  mustSetPassword: boolean
  /** Preferred language of the user (UI and e-mails); null until they choose one (D-069). */
  locale: Locale | null
  /** Organizations an organizer acts for; empty for other account types. */
  organizations: OrganizationSummary[]
}

/** What the user edits in their profile (US-124). */
export type ProfileChange = {
  name?: string
  locale?: Locale
}

/** The profile as saved: the language stays null until the user chooses one. */
export type SavedProfile = {
  name: string
  locale: Locale | null
}
