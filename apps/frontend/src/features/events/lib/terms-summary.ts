import type { TFunction } from "i18next"

import { formatDateRange, formatMonthRange } from "@/lib/date"

import type { OrganizerEvent } from "@/features/events/api/events"

/** O01 / O02: one term shows its dates, several the count and the months they span. */
export function termsSummary(
  event: OrganizerEvent,
  t: TFunction<"events">,
  section: "list" | "header" = "list",
): string {
  const organization = event.organizationName
  if (event.termCount === 0 || !event.startsOn || !event.endsOn) {
    return t(`${section}.noTerms`, { organization })
  }
  if (event.termCount === 1) {
    return t(`${section}.oneTerm`, {
      dates: formatDateRange(event.startsOn, event.endsOn, { shouldShowYear: true }),
      organization,
    })
  }
  return t(`${section}.manyTerms`, {
    count: event.termCount,
    months: formatMonthRange(event.startsOn, event.endsOn),
    organization,
  })
}
