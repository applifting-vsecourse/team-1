import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"

import type { MyApplicationTerm } from "@/features/participant/api/applications"
import { termStatusDisplay } from "@/features/participant/lib/format"

/** Awaiting evaluation, confirmed, waitlisted or cancelled — the participant never sees a place in line. */
// Figma (Design system v2): term status badges in US-54 / Moje přihlášky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15649-2
export function TermStatusBadge({ term }: { term: MyApplicationTerm }) {
  const { t } = useTranslation("participant")
  const { label, tone } = termStatusDisplay[term.status]

  return <Badge variant={tone}>{t(`status.${label}`)}</Badge>
}
