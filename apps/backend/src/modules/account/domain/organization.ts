export type OrganizationProfile = {
  id: string
  name: string
  contactEmail: string | null
  contactPhone: string | null
  bankAccount: string
}

export type OrganizationProfileInput = {
  contactEmail: string
  contactPhone?: string
  bankAccount: string
}

// Czech account number: optional prefix, 1–10 digit account number, four-digit bank code.
export const CZECH_BANK_ACCOUNT_PATTERN = /^(?:\d{1,6}-)?\d{1,10}\/\d{4}$/

export const isCzechBankAccount = (value: string): boolean => CZECH_BANK_ACCOUNT_PATTERN.test(value)
