import { currentLanguage, i18n, INTL_LOCALES, type Language } from "@/i18n"

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

/**
 * The price of a term: `Free` / `Zdarma` for 0, otherwise `formatCzk`. Use it only where a term's
 * price is listed; amounts to pay and totals stay `formatCzk` (`0 Kč`).
 */
export function formatTermPrice(priceCzk: number, language: Language = currentLanguage()) {
  return priceCzk === 0
    ? i18n.t("price.free", { ns: "common", lng: language })
    : formatCzk(priceCzk, language)
}
