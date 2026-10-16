/** Languages of the UI and of e-mails. English is the default. */
export type Locale = 'en' | 'cs';

export const LOCALES: readonly Locale[] = ['en', 'cs'];

export const DEFAULT_LOCALE: Locale = 'en';

export function toLocale(value: unknown): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
}
