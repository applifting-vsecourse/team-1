import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

import { defaultNS, resources } from "@/i18n/resources"

export const LANGUAGES = ["en", "cs"] as const
export type Language = (typeof LANGUAGES)[number]

/** Intl locale used for numbers, money and dates in each UI language. */
export const INTL_LOCALES: Record<Language, string> = { en: "en-GB", cs: "cs-CZ" }

export const LANGUAGE_STORAGE_KEY = "togena.language"

// English by default; on the first visit the browser language decides (a Czech
// browser gets Czech). The visitor's choice from the switcher is remembered in
// localStorage. URLs are the same for both languages.
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    ns: Object.keys(resources.en),
    fallbackLng: "en",
    supportedLngs: LANGUAGES,
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  })

const syncDocumentLanguage = (language: string) => {
  if (typeof document !== "undefined") document.documentElement.lang = language
}
syncDocumentLanguage(i18n.resolvedLanguage ?? "en")
i18n.on("languageChanged", syncDocumentLanguage)

/** The active UI language, narrowed to the supported ones. */
export function currentLanguage(): Language {
  const language = i18n.resolvedLanguage
  return language === "cs" ? "cs" : "en"
}

export { i18n }
