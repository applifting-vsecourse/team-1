/** How applications in a term are evaluated (docs/procesy/zpracovani-prihlasky). */
export type EvaluationMode = "AUTOMATIC" | "MANUAL"

export const DEFAULT_EVALUATION_MODE: EvaluationMode = "AUTOMATIC"

/**
 * The mode can be changed while the event has no application and is locked by
 * the first received one (D-083). Opening the applications does not lock it.
 * `applicationCount` counts every received application, cancelled ones too, so
 * a cancelled application keeps the mode locked.
 */
export function isEvaluationModeLocked(counts: { applicationCount: number }): boolean {
  return counts.applicationCount > 0
}
