import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"

import type { MyApplicationTerm } from "@/features/participant/api/applications"

/** Awaiting evaluation, confirmed, waitlisted or cancelled — the participant never sees a place in line. */
// Figma (Design system v2): term status badges in US-54 / Moje přihlášky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15649-2
export function TermStatusBadge({ term }: { term: MyApplicationTerm }) {
  const { t } = useTranslation("participant")
  const { label, tone } = termStatusBadge[term.status]

  return <Badge variant={tone}>{t(`status.${label}`)}</Badge>
}

/** The #608 neuter label and the DESIGN.md tone of each status. */
const termStatusBadge = {
  TO_EVALUATE: { label: "toEvaluate", tone: "neutral" },
  CONFIRMED: { label: "confirmed", tone: "positive" },
  WAITLISTED: { label: "waitlisted", tone: "waitlist" },
  CANCELLED: { label: "cancelled", tone: "inactive" },
  ARCHIVED: { label: "archived", tone: "neutral" },
} as const
