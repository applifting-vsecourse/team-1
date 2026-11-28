import type { TFunction } from "i18next"

import { formatDateRange, formatMonthRange } from "@/lib/date"

import type { OrganizerEvent } from "@/features/events/api/events"

/** When the event takes place: one term shows its dates, several the count and the months they span. */
export function termsSummary(event: OrganizerEvent, t: TFunction<"events">): string {
  if (event.termCount === 0 || !event.startsOn || !event.endsOn) {
    return t("header.noTerms")
  }
  if (event.termCount === 1) {
    return t("header.oneTerm", {
      dates: formatDateRange(event.startsOn, event.endsOn, { shouldShowYear: true }),
    })
  }
  return t("header.manyTerms", {
    count: event.termCount,
    months: formatMonthRange(event.startsOn, event.endsOn),
  })
}
