import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import type { BulkDecision } from "@/features/event-overview/api/bulkDecision"

// Figma (Design system v2): US-140 Výběr v jednom termínu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24909-147541 (mobile 24909-147776)
// Figma (Design system): US-107 Přihlášky · Vybrané přihlášky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15803-15850 (mobile 15803-16041)
/** What the organizer can do with the selected applications: evaluate them in one step (US-140), or confirm, waitlist or reject them (US-107, US-108); each action has its own colour. */
export function BulkSelectionBar({
  count,
  onEvaluate,
  onConfirm,
  onDecide,
}: {
  count: number
  onEvaluate: () => void
  onConfirm: () => void
  onDecide: (decision: BulkDecision) => void
}) {
  const { t } = useTranslation("eventOverview")
  return (
    <div className="sticky bottom-0 z-20 -mx-4 flex flex-col gap-3 border-t bg-card px-4 py-4 md:static md:mx-0 md:flex-row md:items-center md:justify-between md:rounded-lg md:border md:px-4">
      <p
        role="status"
        aria-atomic="true"
        className="inline-flex items-center gap-2 font-medium tabular-nums"
      >
        <span
          key={count}
          aria-hidden="true"
          className="selection-count-dot size-2 rounded-full bg-primary"
        />
        {t("bulk.selectedApplications", { count })}
      </p>
      <div className="grid grid-cols-2 gap-2 md:flex md:gap-3">
        <Button
          size="lg"
          className="col-span-2"
          onClick={onEvaluate}
        >
          {t("bulkEvaluation.action")}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="h-auto min-h-11 border border-border whitespace-normal"
          onClick={onConfirm}
        >
          {t("bulk.confirm")}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="h-auto min-h-11 border border-border whitespace-normal"
          onClick={() => onDecide("WAITLIST")}
        >
          {t("bulkDecision.waitlist")}
        </Button>
        <Button
          size="lg"
          variant="destructive"
          className="col-span-2 h-auto min-h-11 whitespace-normal md:col-span-1"
          onClick={() => onDecide("REJECT")}
        >
          {t("bulkDecision.reject")}
        </Button>
      </div>
    </div>
  )
}
