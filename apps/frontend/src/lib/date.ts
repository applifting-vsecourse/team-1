import { parseISO } from "date-fns"

import { currentLanguage, INTL_LOCALES, type Language } from "@/i18n"

type DateInput = string | number | Date

const toDate = (date: DateInput) => (typeof date === "string" ? parseISO(date) : date)

/** cs: `7. 2. 2027`, en: `7 Feb 2027` */
export function formatDate(date: DateInput, language: Language = currentLanguage()) {
  return new Intl.DateTimeFormat(INTL_LOCALES[language], { dateStyle: "medium" }).format(
    toDate(date),
  )
}

/** cs: `7. 2. 2027 20:00`, en: `7 Feb 2027, 20:00` */
export function formatDateTime(date: DateInput, language: Language = currentLanguage()) {
  return new Intl.DateTimeFormat(INTL_LOCALES[language], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(toDate(date))
}
