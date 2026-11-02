import type { PublicPageInput } from "@/features/events/api/events"

// The same rules the server applies (`PublicPageRequestDto`), so a mistake shows under its field.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{7,18}[0-9]$/

export type PublicPageField = "name" | "description" | "location" | "contactEmail" | "contactPhone"
export type PublicPageError =
  "nameRequired" | "emailInvalid" | "phoneInvalid" | "requiredForCatalog"
export type PublicPageErrors = Partial<Record<PublicPageField, PublicPageError>>

/** What is wrong with the form; empty when it may be sent. The catalog needs description, venue and e-mail. */
export function validatePublicPage(values: PublicPageInput): PublicPageErrors {
  const errors: PublicPageErrors = {}
  const email = values.contactEmail.trim()
  const phone = values.contactPhone.trim()

  if (!values.name.trim()) errors.name = "nameRequired"
  if (email && !EMAIL_PATTERN.test(email)) errors.contactEmail = "emailInvalid"
  if (phone && !PHONE_PATTERN.test(phone)) errors.contactPhone = "phoneInvalid"
  if (values.publishedInCatalog) {
    if (!values.description.trim()) errors.description = "requiredForCatalog"
    if (!values.location.trim()) errors.location = "requiredForCatalog"
    if (!email) errors.contactEmail = "requiredForCatalog"
  }
  return errors
}
