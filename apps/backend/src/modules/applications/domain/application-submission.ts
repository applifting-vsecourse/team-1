import { Locale } from "@/core/email/locale"
import { Gender } from "@/shared/domain/gender"
import { EvaluatedTerm } from "./evaluation"

/** The event behind an application link, with what a submission needs to know. */
export type SubmissionEvent = {
  id: string
  organizationId: string
  name: string
  bankAccount: string
  roomCount: number
  terms: { id: string; name: string; priceCzk: number }[]
}

/** An application to store: one per participant. */
export type NewApplication = {
  accessToken: string
  firstName: string
  lastName: string
  birthDate: string
  gender: Gender
  email: string
  locale: Locale
  userId: string
  consentAt: Date
  termIds: string[]
}

export type SavedApplication = {
  number: number
  accessToken: string
  firstName: string
  terms: EvaluatedTerm[]
}
