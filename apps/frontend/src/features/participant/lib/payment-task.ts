import type { MyApplication, MyApplicationTerm } from "@/features/participant/api/applications"

export type PaymentTask = {
  /** The summary debt: what the summary symbol pays now. */
  amountCzk: number
  /** The confirmed terms that still owe something. */
  terms: MyApplicationTerm[]
  /** The earliest due date of those terms (ISO datetime), `null` when none is set. */
  deadline: string | null
}

/** What is left to pay on an application, or `null` when nothing is (the to-do cards, Figma F4). */
export function paymentTask(application: MyApplication): PaymentTask | null {
  const details = application.paymentDetails
  if (!details || details.summary.payableCzk <= 0) return null
  const owed = details.terms.filter(({ owedCzk }) => owedCzk > 0)
  return {
    amountCzk: details.summary.payableCzk,
    terms: application.terms.filter(({ termId }) => owed.some((term) => term.termId === termId)),
    deadline:
      owed
        .map(({ paymentDeadline }) => paymentDeadline)
        .filter((deadline) => deadline !== null)
        .sort()[0] ?? null,
  }
}
