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
  const dates = formatDateRange(event.startsOn, event.endsOn, { shouldShowYear: true })
  if (section === "list") {
    return t("list.termsSummary", {
      count: event.termCount,
      months: event.termCount === 1 ? dates : formatMonthRange(event.startsOn, event.endsOn),
      organization,
    })
  }
  if (event.termCount === 1) {
    return t("header.oneTerm", { dates, organization })
  }
  return t("header.manyTerms", {
    count: event.termCount,
    months: formatMonthRange(event.startsOn, event.endsOn),
    organization,
  })
}
