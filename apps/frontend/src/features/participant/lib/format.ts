import { formatDateRange } from "@/lib/date"

import type { MyApplicationTerm } from "@/features/participant/api/applications"

/** `12.–18. 7. 2027` — one term, always with the year. */
export const termRange = (term: MyApplicationTerm): string =>
  formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })

/** `tel:` link target: the phone as typed, without spaces, so one tap dials it. */
export const toTelHref = (phone: string): string => `tel:${phone.replace(/\s+/g, "")}`
