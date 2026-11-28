import { formatDateRange } from "@/lib/date"

import type { MyApplicationTerm } from "@/features/participant/api/applications"

/** `12.–18. 7. 2027` — one term, always with the year. */
export const termRange = (term: MyApplicationTerm): string =>
  formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })

/** `tel:` link target: the phone as typed, without spaces, so one tap dials it. */
export const toTelHref = (phone: string): string => `tel:${phone.replace(/\s+/g, "")}`

/** The #608 neuter label and the DESIGN.md tone of each status. */
export const termStatusDisplay = {
  TO_EVALUATE: { label: "toEvaluate", tone: "neutral" },
  CONFIRMED: { label: "confirmed", tone: "positive" },
  WAITLISTED: { label: "waitlisted", tone: "waitlist" },
  CANCELLED: { label: "cancelled", tone: "inactive" },
  ARCHIVED: { label: "archived", tone: "neutral" },
} as const
