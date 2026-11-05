const DAY_MS = 24 * 60 * 60 * 1000

/** US-112: a correction starts a full new period using the event's duration (D-099, D-101). */
export function computePaymentDeadline(input: {
  paymentPeriodStartedAt: Date | null
  paymentPeriodDays: number
}): Date | null {
  return input.paymentPeriodStartedAt === null
    ? null
    : new Date(input.paymentPeriodStartedAt.getTime() + input.paymentPeriodDays * DAY_MS)
}
