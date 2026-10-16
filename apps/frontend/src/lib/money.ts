import { currentLanguage, INTL_LOCALES, type Language } from "@/i18n"

/**
 * Amounts are whole crowns everywhere (see docs/PROJEKT.md, data model).
 * cs: `1 500 Kč`, en: `CZK 1,500`.
 */
export function formatCzk(amountCzk: number, language: Language = currentLanguage()) {
  return new Intl.NumberFormat(INTL_LOCALES[language], {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(amountCzk)
}
