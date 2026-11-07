import {
  ApplicationFilters,
  applicationList,
  ListedApplication,
} from "@/modules/overview/domain/application-list"
import { PaymentOverview } from "@/modules/overview/domain/payment-overview"

/**
 * The filter each attention card links to in the applications list. The counts below are
 * computed with these very filters, so a card and the list it opens never disagree (US-51).
 * Change requests are a view of their own (`?view=CHANGE_REQUESTS`), not a list filter.
 */
export const ATTENTION_FILTERS = {
  toEvaluate: { status: "TO_EVALUATE" },
  debt: { payment: "DEBT" },
} as const satisfies Record<string, ApplicationFilters>

export type Attention = {
  /** Applications with a term awaiting evaluation. */
  toEvaluateCount: number
  /** Participants with a debt; the figures are those of the payments overview (US-45). */
  debt: { debtorCount: number; overdueCount: number; totalDebtCzk: number }
  /** Change requests awaiting approval. */
  changeRequestCount: number
}

export function computeAttention(
  applications: ListedApplication[],
  payments: PaymentOverview,
  pendingChangeRequests: number,
): Attention {
  return {
    toEvaluateCount: applicationList(applications, ATTENTION_FILTERS.toEvaluate).length,
    debt: {
      debtorCount: payments.debtorCount,
      overdueCount: payments.overdueCount,
      totalDebtCzk: payments.totalDebtCzk,
    },
    changeRequestCount: pendingChangeRequests,
  }
}
