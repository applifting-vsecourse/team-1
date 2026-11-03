import { DEFAULT_LOCALE, Locale } from "@/core/email/locale"

/**
 * Language of the e-mails about a changed application (D-078, EMAILY.md): the preferred language
 * of the user, else the language of their first application. E-mail no. 1 is not decided here,
 * it stays in the language of its application.
 *
 * `User.locale` is a non-null column that defaults to `en`, so the schema cannot tell "never set"
 * from an explicit `en` (US-128 adds that). Until then only a language other than the default is
 * a preference; `en` counts as "not set" and the first application decides. An applicant without
 * an account has no preference: the application's own language.
 */
export function resolveChangeEmailLocale(input: {
  /** `User.locale` of the account the application is attached to; null without an account. */
  userLocale: Locale | null
  /** Language of the oldest application of that user, or of this application without an account. */
  firstApplicationLocale: Locale
}): Locale {
  if (input.userLocale !== null && input.userLocale !== DEFAULT_LOCALE) return input.userLocale
  return input.firstApplicationLocale
}
