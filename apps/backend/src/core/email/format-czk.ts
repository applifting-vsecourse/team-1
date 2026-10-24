import { Locale } from "@/core/email/locale"

const INTL_LOCALES: Record<Locale, string> = { cs: "cs-CZ", en: "en-GB" }

/**
 * Whole crowns for an e-mail, the same way the app shows them: cs `1 500 Kč`,
 * en `CZK 1,500` (docs/PROJEKT.md, localization).
 */
export function formatCzk(amountCzk: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALES[locale], {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(amountCzk)
}
