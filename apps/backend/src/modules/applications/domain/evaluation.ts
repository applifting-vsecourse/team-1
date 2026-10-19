import { Gender, GenderCounts } from "@/shared/domain/gender"

export type ApplicationTermStatus = "CONFIRMED" | "WAITLISTED"

/** Confirmed only if a bed for the applicant's gender is free (US-27). */
export function evaluateTerm(gender: Gender, freePlaces: GenderCounts): ApplicationTermStatus {
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
  status: ApplicationTermStatus
  /** Price frozen at evaluation. */
  priceCzk: number
}

/**
 * Evaluates every selected term of one application separately — confirmed in
 * one term, waitlisted in another is a normal outcome.
 */
export function evaluateApplication(gender: Gender, terms: TermToEvaluate[]): EvaluatedTerm[] {
  return terms.map((term) => ({
    termId: term.termId,
    status: evaluateTerm(gender, term.freePlaces),
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
): ApplicationTermStatus[] {
  const free: GenderCounts = { ...capacity }
  return applicants.map((gender) => {
    const status = evaluateTerm(gender, free)
    if (status === "CONFIRMED") free[gender] -= 1
    return status
  })
}
