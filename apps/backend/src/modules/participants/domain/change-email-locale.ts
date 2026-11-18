import { Locale } from "@/core/email/locale"

/**
 * Language of the e-mails about a changed application (D-078, EMAILY.md): the preferred language
 * of the user, else the language of their first application. E-mail no. 1 is not decided here,
 * it stays in the language of its application.
 *
 * `User.locale` is null until the user chooses a language in the account settings. An applicant
 * without an account has no preference: the application's own language.
 */
export function resolveChangeEmailLocale(input: {
  /** `User.locale` of the account the application is attached to; null when unset or without an account. */
  userLocale: Locale | null
  /** Language of the oldest application of that user, or of this application without an account. */
  firstApplicationLocale: Locale
}): Locale {
  return input.userLocale ?? input.firstApplicationLocale
}
