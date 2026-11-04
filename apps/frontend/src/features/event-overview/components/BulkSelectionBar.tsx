import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import type { BulkDecision } from "@/features/event-overview/api/bulkDecision"

// Figma (Design system): US-107 Přihlášky · Vybrané přihlášky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15803-15850 (mobile 15803-16041)
/** What the organizer can do with the selected applications; each action has its own colour. */
export function BulkSelectionBar({
  count,
  onConfirm,
  onDecide,
}: {
  count: number
  onConfirm: () => void
  onDecide: (decision: BulkDecision) => void
}) {
  const { t } = useTranslation("eventOverview")
  return (
    <div className="sticky bottom-0 z-20 -mx-4 flex flex-col gap-3 border-t bg-card px-4 py-4 md:static md:mx-0 md:flex-row md:items-center md:justify-between md:rounded-lg md:border md:px-4">
      <p className="font-medium">{t("bulk.selectedApplications", { count })}</p>
      <div className="flex flex-col gap-3 md:flex-row">
        <Button
          size="lg"
          onClick={onConfirm}
        >
          {t("bulk.confirm")}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="border border-border"
          onClick={() => onDecide("WAITLIST")}
        >
          {t("bulkDecision.waitlist")}
        </Button>
        <Button
          size="lg"
          variant="destructive"
          onClick={() => onDecide("REJECT")}
        >
          {t("bulkDecision.reject")}
        </Button>
      </div>
    </div>
  )
}
