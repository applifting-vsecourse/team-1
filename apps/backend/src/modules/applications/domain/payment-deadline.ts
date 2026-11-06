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

/** D-099: late confirmation is already overdue; a correction restarts the full period (D-100). */
export function computeOverviewPaymentDeadline(input: {
  confirmedAt: Date
  paymentPeriodStartedAt: Date | null
  startsOn: Date
  paymentPeriodDays: number
}): Date {
  const { confirmedAt, paymentPeriodStartedAt, startsOn, paymentPeriodDays } = input
  const restartedLater =
    paymentPeriodStartedAt !== null && paymentPeriodStartedAt.getTime() > confirmedAt.getTime()
  if (!restartedLater && confirmedAt.getTime() >= startsOn.getTime() - paymentPeriodDays * DAY_MS) {
    return confirmedAt
  }
  return computePaymentDeadline({
    paymentPeriodStartedAt: restartedLater ? paymentPeriodStartedAt : confirmedAt,
    paymentPeriodDays,
  })!
}
