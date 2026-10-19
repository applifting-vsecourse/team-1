import { format } from "date-fns"
import type { TFunction } from "i18next"
import { z } from "zod"

export const GENDERS = ["FEMALE", "MALE"] as const

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const EARLIEST_BIRTH_DATE = "1900-01-01"

/** `2000-02-31` matches the pattern but is not a day. */
const isRealDate = (value: string) =>
  ISO_DATE.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value

/**
 * One participant: personal data plus the terms they apply for. Contact
 * e-mail and consent are shared by the whole application (docs: US-23).
 *
 * Built per render language so messages follow the UI language; the server
 * validates the same rules again.
 */
export const createApplicationFormSchema = (
  t: TFunction<"applicationForm">,
  today = new Date(),
) => {
  const todayIso = format(today, "yyyy-MM-dd")

  const participant = z.object({
    firstName: z.string().trim().min(1, t("form.errors.firstNameRequired")),
    lastName: z.string().trim().min(1, t("form.errors.lastNameRequired")),
    // Empty, impossible, before 1900 and in the future all read the same (Figma M03).
    birthDate: z
      .string()
      .refine(isRealDate, t("form.errors.birthDateInvalid"))
      .refine((value) => value >= EARLIEST_BIRTH_DATE, t("form.errors.birthDateInvalid"))
      .refine((value) => value <= todayIso, t("form.errors.birthDateInvalid")),
    gender: z.enum(GENDERS, { error: t("form.errors.genderRequired") }),
    termIds: z.array(z.string()).min(1, t("form.errors.termsRequired")),
  })

  return z.object({
    email: z.string().trim().email(t("form.errors.emailInvalid")),
    consent: z.boolean().refine((isConsented) => isConsented, t("form.errors.consentRequired")),
    participants: z.array(participant).min(1),
  })
}

export type ApplicationFormValues = z.infer<ReturnType<typeof createApplicationFormSchema>>
export type ParticipantValues = ApplicationFormValues["participants"][number]

/**
 * What the user is still typing: nothing is chosen in the gender field yet, so
 * it may be missing. Only a complete `ApplicationFormValues` passes validation.
 */
export type ParticipantDraft = Omit<ParticipantValues, "gender"> & {
  gender?: ParticipantValues["gender"]
}
export type ApplicationFormDraft = Omit<ApplicationFormValues, "participants"> & {
  participants: ParticipantDraft[]
}
