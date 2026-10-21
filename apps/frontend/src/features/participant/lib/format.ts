import { formatDateRange } from "@/lib/date"

import type { MyApplication, MyApplicationTerm } from "@/features/participant/api/applications"

/** `12.–18. 7. 2027` — one term. */
export const termRange = (term: MyApplicationTerm): string =>
  formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })

/** `12.–18. 7. + 19.–25. 7. 2027` — all terms of the application, the year once at the end. */
export function termsOverview(application: MyApplication): string {
  const { terms } = application
  const ranges = terms.map((term) => formatDateRange(term.startsOn, term.endsOn))
  const year = new Date(terms[terms.length - 1]?.endsOn ?? Date.now()).getFullYear()
  return `${ranges.join(" + ")} ${year}`
}

/** `12.–18. 7.` — a term without the year, for the status lines of the list. */
export const termRangeShort = (term: MyApplicationTerm): string =>
  formatDateRange(term.startsOn, term.endsOn)
