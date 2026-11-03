import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { ApplicationsSearch } from "@/features/event-overview/lib/applications-search"

const VIEWS = [
  { key: "viewAll", status: undefined },
  { key: "status", status: "TO_EVALUATE" },
  { key: "viewWaitlist", status: "WAITLISTED" },
] as const

// Figma (Design system): US-103 Přihlášky · Fronta od nejstarších, chips "Pohledy přihlášek podle dema" · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15765-4897
export function ApplicationViews({
  filters,
  onChange,
}: {
  filters: ApplicationsSearch
  onChange: (filters: ApplicationsSearch) => void
}) {
  const { t } = useTranslation("eventOverview")
  return (
    <nav
      aria-label={t("queue.views")}
      className="flex flex-wrap gap-2"
    >
      {VIEWS.map((view) => {
        const isActive =
          view.status === undefined
            ? filters.status !== "TO_EVALUATE" && filters.status !== "WAITLISTED"
            : filters.status === view.status
        return (
          <Button
            key={view.key}
            variant="outline"
            size="lg"
            aria-pressed={isActive}
            className={cn(
              "rounded-full",
              isActive && "border-border bg-accent text-accent-foreground",
            )}
            onClick={() => {
              const next = { ...filters, status: view.status }
              if (view.status === undefined) delete next.status
              onChange(next)
            }}
          >
            {t(`queue.${view.key}`)}
          </Button>
        )
      })}
    </nav>
  )
}
