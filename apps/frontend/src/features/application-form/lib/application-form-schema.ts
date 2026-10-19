import { format } from "date-fns"
import type { TFunction } from "i18next"
import { z } from "zod"

import { parseBirthDate } from "@/features/application-form/lib/birth-date"

export const GENDERS = ["FEMALE", "MALE"] as const

const EARLIEST_BIRTH_DATE = "1900-01-01"

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
    // Typed as `18. 5. 2014`, sent as ISO. Empty, impossible, before 1900 and
    // in the future all read the same (Figma M03).
    birthDate: z.string().transform((text, ctx) => {
      const iso = parseBirthDate(text)
      if (!iso || iso < EARLIEST_BIRTH_DATE || iso > todayIso) {
        ctx.addIssue({ code: "custom", message: t("form.errors.birthDateInvalid") })
        return z.NEVER
      }
      return iso
    }),
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
