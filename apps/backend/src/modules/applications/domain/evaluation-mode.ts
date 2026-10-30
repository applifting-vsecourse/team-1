import { isOpenForApplications } from "@/modules/applications/domain/public-event"

/** How applications in a term are evaluated (docs/procesy/zpracovani-prihlasky). */
export type EvaluationMode = "AUTOMATIC" | "MANUAL"

export const DEFAULT_EVALUATION_MODE: EvaluationMode = "AUTOMATIC"

/**
 * The mode is chosen before applications open and never changes afterwards
 * (US-101). "Open" is the same check as for the application link
 * (`isOpenForApplications`); an event that already has an application stays
 * locked even if a term or room was removed later.
 */
export function isEvaluationModeLocked(counts: {
  termCount: number
  roomCount: number
  applicationCount: number
}): boolean {
  return isOpenForApplications(counts) || counts.applicationCount > 0
}
