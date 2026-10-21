import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"

import type { MyApplicationTerm } from "@/features/participant/api/applications"
import { termRange } from "@/features/participant/lib/format"

/** The term's dates with the year and its name underneath. */
// Figma (Design system): U / Term status row · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13884-219
export function TermLabel({ term }: { term: MyApplicationTerm }) {
  return (
    <span className="flex flex-1 flex-col">
      <span className="font-medium tabular-nums">{termRange(term)}</span>
      <span className="sr-only"> · </span>
      <span className="text-sm text-muted-foreground">{term.name}</span>
    </span>
  )
}

/** Confirmed or waitlisted with the place in line (Figma DS / Badge). */
export function TermStatusBadge({ term }: { term: MyApplicationTerm }) {
  const { t } = useTranslation("participant")
  const isConfirmed = term.status === "CONFIRMED"

  return (
    <Badge variant={isConfirmed ? "success" : "waitlist"}>
      {isConfirmed
        ? t("status.confirmedLong")
        : `${t("status.waitlistedLong")} · ${t("status.position", { position: term.waitlistPosition })}`}
    </Badge>
  )
}
