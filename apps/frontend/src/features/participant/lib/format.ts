import { formatDateRange } from "@/lib/date"

import type { MyApplicationTerm } from "@/features/participant/api/applications"

/** `12.–18. 7. 2027` — one term, always with the year. */
export const termRange = (term: MyApplicationTerm): string =>
  formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })
