import { ApplicationTermStatus } from "./evaluation"
import { computeTermOwed } from "./pricing"
import { todayInPrague } from "./waitlist-expiry"

/** Both evaluation modes archive paid confirmed terms from the next Prague calendar day. */
export function canArchiveTerm(
  term: { status: ApplicationTermStatus; priceCzk: number; endsOn: Date; cancelledAt: Date | null },
  payments: { amountCzk: number }[],
  now: Date,
): boolean {
  return (
    term.status === "CONFIRMED" &&
    term.cancelledAt === null &&
    term.endsOn < todayInPrague(now) &&
    computeTermOwed(term, payments) <= 0
  )
}
