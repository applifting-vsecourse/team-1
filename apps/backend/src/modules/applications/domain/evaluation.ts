import { EvaluationMode } from "@/modules/applications/domain/evaluation-mode"
import { Gender, GenderCounts } from "@/shared/domain/gender"

/**
 * Status of an application in a term; CANCELLED is terminal (US-28). TO_EVALUATE
 * ("K vyhodnocení", US-102) exists only in the manual evaluation mode: the application
 * is registered and waits for the organizer; it takes no bed and owes nothing.
 */
export type ApplicationTermStatus = "TO_EVALUATE" | "CONFIRMED" | "WAITLISTED" | "CANCELLED"

/** What the automatic evaluation of a new application can decide. */
export type AutomaticEvaluationStatus = "CONFIRMED" | "WAITLISTED"

/** What a new application in a term starts as: the automatic outcome, or waiting for the organizer. */
export type EvaluationStatus = AutomaticEvaluationStatus | "TO_EVALUATE"

/** Confirmed only if a bed for the applicant's gender is free (US-27). */
export function evaluateTerm(gender: Gender, freePlaces: GenderCounts): AutomaticEvaluationStatus {
  return freePlaces[gender] > 0 ? "CONFIRMED" : "WAITLISTED"
}

export type TermToEvaluate = {
  termId: string
  priceCzk: number
  /** Free places in the term right now, read under a row lock. */
  freePlaces: GenderCounts
}

export type EvaluatedTerm = {
  termId: string
  status: EvaluationStatus
  /** Price frozen at evaluation. */
  priceCzk: number
}

/**
 * Evaluates every selected term of one application separately — confirmed in
 * one term, waitlisted in another is a normal outcome. In the manual mode nothing
 * is decided here: every term starts as TO_EVALUATE (US-102), whatever the free beds.
 */
export function evaluateApplication(
  gender: Gender,
  terms: TermToEvaluate[],
  mode: EvaluationMode,
): EvaluatedTerm[] {
  return terms.map((term) => ({
    termId: term.termId,
    status: mode === "MANUAL" ? "TO_EVALUATE" : evaluateTerm(gender, term.freePlaces),
    priceCzk: term.priceCzk,
  }))
}

/**
 * Evaluates applicants of one term in arrival order, each confirmation taking
 * a bed from the next one. This is what the server does one transaction at a
 * time; the function exists so the rule can be tested on whole scenarios.
 */
export function evaluateQueue(
  capacity: GenderCounts,
  applicants: Gender[],
): AutomaticEvaluationStatus[] {
  const free: GenderCounts = { ...capacity }
  return applicants.map((gender) => {
    const status = evaluateTerm(gender, free)
    if (status === "CONFIRMED") free[gender] -= 1
    return status
  })
}
