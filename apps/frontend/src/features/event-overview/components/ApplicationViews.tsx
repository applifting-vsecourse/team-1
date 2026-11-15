import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

import { substituteProposalsQueryOptions } from "@/features/event-overview/api/substitutes"
import type { ApplicationsSearch } from "@/features/event-overview/lib/applications-search"

const VIEWS = [
  { key: "viewAll", value: "all" },
  { key: "status", value: "TO_EVALUATE" },
  { key: "viewWaitlist", value: "WAITLISTED" },
  { key: "viewRequests", value: "CHANGE_REQUESTS" },
] as const

const isView = (status: ApplicationsSearch["status"]): status is "TO_EVALUATE" | "WAITLISTED" =>
  status === "TO_EVALUATE" || status === "WAITLISTED"

// Figma (Design system): US-103 Přihlášky · Fronta od nejstarších, chips "Pohledy přihlášek podle dema" · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16852-31378
// The chips and the status filter read and write the same `status` param, so they cannot disagree.
export function ApplicationViews({
  eventId,
  filters,
  onChange,
}: {
  eventId: string
  filters: ApplicationsSearch
  onChange: (filters: ApplicationsSearch) => void
}) {
  const { t } = useTranslation("eventOverview")
  // US-31: the substitutes view carries the number of free beds waiting for the organizer.
  const proposalCount = useQuery(substituteProposalsQueryOptions(eventId)).data?.length ?? 0
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={2}
      aria-label={t("queue.views")}
      className="flex-wrap"
      // The queue and the waitlist are views of their own; any other status is still "All".
      value={
        filters.view === "CHANGE_REQUESTS"
          ? "CHANGE_REQUESTS"
          : isView(filters.status)
            ? filters.status
            : "all"
      }
      onValueChange={(value) => {
        // Pressing the active chip again must not leave the group empty.
        // Pressing the active chip again must not leave the group empty; on "All" it clears a
        // status picked in the filter (confirmed, cancelled).
        const chosen = value || "all"
        const next = { ...filters }
        delete next.view
        // The free-bed filter comes from the card of the overview; choosing a view leaves it.
        delete next.waitlist
        if (chosen === "all") {
          if (!filters.status && !filters.view && !filters.waitlist) return
          delete next.status
        } else if (chosen === "CHANGE_REQUESTS") {
          delete next.status
          next.view = "CHANGE_REQUESTS"
        } else next.status = chosen as "TO_EVALUATE" | "WAITLISTED"
        onChange(next)
      }}
    >
      {VIEWS.map((view) => (
        <ToggleGroupItem
          key={view.key}
          value={view.value}
          aria-label={
            view.value === "WAITLISTED" && proposalCount > 0
              ? t("queue.proposalCount", { view: t(`queue.${view.key}`), count: proposalCount })
              : undefined
          }
          className="h-9 rounded-full px-3 data-[state=on]:border-border data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
        >
          {t(`queue.${view.key}`)}
          {view.value === "WAITLISTED" && proposalCount > 0 ? (
            <Badge
              variant="info"
              aria-hidden="true"
            >
              {proposalCount}
            </Badge>
          ) : null}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
