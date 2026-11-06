import { todayInPrague } from "@/modules/applications/domain/waitlist-expiry"
import { canChangeImmediately } from "@/modules/events/domain/cancellation-start"
import { computeAmountOwed, computeRefundableAmount, computeTermPaid } from "./pricing"

export type ParticipantTermOption = {
  id: string
  name: string | null
  startsOn: string
  endsOn: string
  priceCzk: number
  /** Projected debt if this term is added now, evaluated by the domain. */
  owedAfterChangeCzk: number
  paidCzk: number
  owedAfterCancellationCzk: number
  overpaymentAfterCancellationCzk: number
  selected: boolean
}

export type ParticipantChangeOptions = {
  canChangeImmediately: boolean
  terms: ParticipantTermOption[]
}

/** Payment impact of newly added terms, calculated in the write transaction. */
export type ParticipantTermChangeResult = {
  addedTerms: { termId: string; owedCzk: number }[]
}

/** One Prague calendar day controls both the options and the write. */
export function participantChangeAllowed(startsOn: Date | null, now: Date): boolean {
  return canChangeImmediately(startsOn, todayInPrague(now))
}

/** Cancelling a term removes its due amount, while recorded payments stay with it. */
export function cancellationPaymentImpact(
  payments: { amountCzk: number }[],
): Pick<
  ParticipantTermOption,
  "paidCzk" | "owedAfterCancellationCzk" | "overpaymentAfterCancellationCzk"
> {
  const paidCzk = computeTermPaid(payments)
  return {
    paidCzk,
    owedAfterCancellationCzk: Math.max(0, computeAmountOwed(0, paidCzk)),
    overpaymentAfterCancellationCzk: computeRefundableAmount(0, paidCzk),
  }
}
